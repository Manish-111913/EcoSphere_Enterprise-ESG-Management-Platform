import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, XpEntryType, XpLedger, XpSourceType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

export interface CreditParams {
  employeeId: string;
  points: number; // positive
  sourceType: XpSourceType;
  sourceId: string;
  remarks?: string;
}

export interface DebitParams {
  employeeId: string;
  points: number; // positive amount to remove
  sourceType: XpSourceType;
  sourceId: string;
  remarks?: string;
}

/**
 * Single points currency (XP = Points). APPEND-ONLY: never UPDATE/DELETE a
 * ledger row — reversals are compensating rows (spec §A3.4). Every mutating
 * method takes a transaction client so it runs inside the caller's atomic flow.
 */
@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  /** Current balance = Σ signed points (append-only ledger). */
  async balance(employeeId: string): Promise<number> {
    return this.balanceTx(this.prisma, employeeId);
  }

  private async balanceTx(db: Tx | PrismaService, employeeId: string): Promise<number> {
    const agg = await db.xpLedger.aggregate({
      where: { employeeId },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }

  /**
   * Idempotent credit: the (source_type, source_id, EARN) unique key guarantees
   * XP is granted exactly once per approval (spec §A3.4). Returns credited=false
   * if it was already applied.
   */
  async credit(
    tx: Tx,
    { employeeId, points, sourceType, sourceId, remarks }: CreditParams,
  ): Promise<{ credited: boolean; entry?: XpLedger }> {
    if (points <= 0) return { credited: false };

    const existing = await tx.xpLedger.findUnique({
      where: {
        sourceType_sourceId_entryType: {
          sourceType,
          sourceId,
          entryType: XpEntryType.EARN,
        },
      },
    });
    if (existing) return { credited: false, entry: existing };

    const balance = await this.balanceTx(tx, employeeId);
    try {
      const entry = await tx.xpLedger.create({
        data: {
          employeeId,
          entryType: XpEntryType.EARN,
          points,
          sourceType,
          sourceId,
          balanceAfter: balance + points,
          remarks,
        },
      });
      return { credited: true, entry };
    } catch (e) {
      // unique key is the final race guard → already credited elsewhere
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { credited: false };
      }
      throw e;
    }
  }

  /** Debit with balance check; balance_after CHECK(>=0) is the DB backstop. */
  async debit(
    tx: Tx,
    { employeeId, points, sourceType, sourceId, remarks }: DebitParams,
  ): Promise<XpLedger> {
    const balance = await this.balanceTx(tx, employeeId);
    if (balance < points) {
      throw new UnprocessableEntityException({
        code: 'INSUFFICIENT_POINTS',
        message: 'Insufficient points balance',
      });
    }
    return tx.xpLedger.create({
      data: {
        employeeId,
        entryType: XpEntryType.REDEEM,
        points: -points,
        sourceType,
        sourceId,
        balanceAfter: balance - points,
        remarks,
      },
    });
  }

  /** Compensating adjustment (e.g. redemption cancellation credit). */
  async adjust(
    tx: Tx,
    { employeeId, points, sourceType, sourceId, remarks }: CreditParams,
  ): Promise<XpLedger> {
    const balance = await this.balanceTx(tx, employeeId);
    const newBalance = balance + points;
    if (newBalance < 0) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'Adjustment would drive balance negative',
      });
    }
    return tx.xpLedger.create({
      data: {
        employeeId,
        entryType: XpEntryType.ADJUST,
        points,
        sourceType,
        sourceId,
        balanceAfter: newBalance,
        remarks,
      },
    });
  }
}
