import {
  Challenge,
  ChallengeParticipation,
  Badge,
  BadgeAward,
  Reward,
  RewardRedemption,
  XpLedgerEntry,
  Employee,
  UserRole
} from '../types';
import {
  mockChallenges,
  mockChallengeParticipations,
  mockBadges,
  mockBadgeAwards,
  mockRewards,
  mockRewardRedemptions,
  mockXpLedgers,
  mockEmployees
} from '../mocks/db';

const STORAGE_KEYS = {
  CHALLENGES: 'ecosphere_challenges',
  PARTICIPATIONS: 'ecosphere_participations',
  BADGES: 'ecosphere_badges',
  BADGE_AWARDS: 'ecosphere_badge_awards',
  REWARDS: 'ecosphere_rewards',
  REDEMPTIONS: 'ecosphere_redemptions',
  XP_LEDGER: 'ecosphere_xp_ledger',
  EMPLOYEES: 'ecosphere_employees'
};

// Extends participation to store progress dynamically
export interface EnhancedParticipation extends ChallengeParticipation {
  progress?: number;
  feedback?: string;
}

class GamificationService {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    if (!localStorage.getItem(STORAGE_KEYS.CHALLENGES)) {
      localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(mockChallenges));
    }
    if (!localStorage.getItem(STORAGE_KEYS.PARTICIPATIONS)) {
      // Map initial participations, default progress to 100 for completed, 0 for in progress, 100 for pending review
      const enhanced = mockChallengeParticipations.map(p => ({
        ...p,
        progress: p.status === 'Completed' || p.status === 'Pending Review' ? 100 : 0
      }));
      localStorage.setItem(STORAGE_KEYS.PARTICIPATIONS, JSON.stringify(enhanced));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BADGES)) {
      localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(mockBadges));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BADGE_AWARDS)) {
      localStorage.setItem(STORAGE_KEYS.BADGE_AWARDS, JSON.stringify(mockBadgeAwards));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REWARDS)) {
      localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(mockRewards));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REDEMPTIONS)) {
      localStorage.setItem(STORAGE_KEYS.REDEMPTIONS, JSON.stringify(mockRewardRedemptions));
    }
    if (!localStorage.getItem(STORAGE_KEYS.XP_LEDGER)) {
      localStorage.setItem(STORAGE_KEYS.XP_LEDGER, JSON.stringify(mockXpLedgers));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(mockEmployees));
    }
  }

  private getItems<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setItems<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  // --- Challenges ---
  getChallenges(): Challenge[] {
    return this.getItems<Challenge>(STORAGE_KEYS.CHALLENGES);
  }

  getChallengeById(id: string): Challenge | undefined {
    return this.getChallenges().find(c => c.id === id);
  }

  createChallenge(challenge: Omit<Challenge, 'id'>): Challenge {
    const challenges = this.getChallenges();
    const newChallenge: Challenge = {
      ...challenge,
      id: `ch-${challenges.length + 1}`
    };
    challenges.push(newChallenge);
    this.setItems(STORAGE_KEYS.CHALLENGES, challenges);
    return newChallenge;
  }

  updateChallengeStatus(id: string, status: Challenge['status']): void {
    const challenges = this.getChallenges();
    const index = challenges.findIndex(c => c.id === id);
    if (index !== -1) {
      challenges[index].status = status;
      this.setItems(STORAGE_KEYS.CHALLENGES, challenges);
    }
  }

  // --- Participations ---
  getParticipations(): EnhancedParticipation[] {
    return this.getItems<EnhancedParticipation>(STORAGE_KEYS.PARTICIPATIONS);
  }

  getParticipationsByChallenge(challengeId: string): EnhancedParticipation[] {
    return this.getParticipations().filter(p => p.challengeId === challengeId);
  }

  getParticipationForUser(challengeId: string, employeeId: string): EnhancedParticipation | undefined {
    return this.getParticipations().find(p => p.challengeId === challengeId && p.employeeId === employeeId);
  }

  joinChallenge(challengeId: string, employeeId: string): EnhancedParticipation {
    const participations = this.getParticipations();
    const existing = participations.find(p => p.challengeId === challengeId && p.employeeId === employeeId);
    if (existing) return existing;

    const newPart: EnhancedParticipation = {
      id: `ch-part-${Date.now()}`,
      challengeId,
      employeeId,
      status: 'In Progress',
      progress: 0,
      timestamp: new Date().toISOString()
    };
    participations.push(newPart);
    this.setItems(STORAGE_KEYS.PARTICIPATIONS, participations);
    return newPart;
  }

  updateParticipationProgress(challengeId: string, employeeId: string, progress: number): void {
    const participations = this.getParticipations();
    const index = participations.findIndex(p => p.challengeId === challengeId && p.employeeId === employeeId);
    if (index !== -1) {
      participations[index].progress = progress;
      this.setItems(STORAGE_KEYS.PARTICIPATIONS, participations);
    }
  }

  submitChallengeProof(challengeId: string, employeeId: string, proofUrl: string, progress: number): EnhancedParticipation {
    const participations = this.getParticipations();
    const index = participations.findIndex(p => p.challengeId === challengeId && p.employeeId === employeeId);
    let participation: EnhancedParticipation;

    if (index !== -1) {
      participations[index].status = 'Pending Review';
      participations[index].proofUrl = proofUrl;
      participations[index].progress = progress;
      participations[index].timestamp = new Date().toISOString();
      participation = participations[index];
    } else {
      participation = {
        id: `ch-part-${Date.now()}`,
        challengeId,
        employeeId,
        status: 'Pending Review',
        proofUrl,
        progress,
        timestamp: new Date().toISOString()
      };
      participations.push(participation);
    }

    this.setItems(STORAGE_KEYS.PARTICIPATIONS, participations);

    // If the challenge is "Active", let's update challenge status to Under Review if needed,
    // or keep it Active and let submissions accumulate.
    return participation;
  }

  reviewSubmission(participationId: string, status: 'Approved' | 'Rejected', feedback?: string): EnhancedParticipation | undefined {
    const participations = this.getParticipations();
    const pIdx = participations.findIndex(p => p.id === participationId);
    if (pIdx === -1) return undefined;

    const p = participations[pIdx];
    const challenge = this.getChallengeById(p.challengeId);
    if (!challenge) return undefined;

    p.status = status === 'Approved' ? 'Completed' : 'Failed';
    p.feedback = feedback;
    p.timestamp = new Date().toISOString();
    this.setItems(STORAGE_KEYS.PARTICIPATIONS, participations);

    if (status === 'Approved') {
      // Award XP & Points!
      this.awardEmployeeRewards(p.employeeId, challenge.xp, challenge.points, `Completed Challenge: ${challenge.title}`, `challenge-${challenge.id}`);
    }

    return p;
  }

  // --- Employees & Profiles ---
  getEmployees(): Employee[] {
    return this.getItems<Employee>(STORAGE_KEYS.EMPLOYEES);
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.getEmployees().find(e => e.id === id);
  }

  getEmployeeByRole(role: UserRole): Employee | undefined {
    const roleMapping: Record<UserRole, string> = {
      Admin: 'eleanor.vance@ecosphere.com',
      'ESG Manager': 'alistair.green@ecosphere.com',
      'CSR Manager': 'samantha.s@ecosphere.com',
      'Compliance Officer': 'reginald.vance@ecosphere.com',
      'Department Head': 'marcus.aurelius@ecosphere.com',
      Employee: 'david.beckham@ecosphere.com',
      Auditor: 'arthur.inspector@ecosphere.com'
    };
    const email = roleMapping[role];
    return this.getEmployees().find(e => e.email === email);
  }

  awardEmployeeRewards(employeeId: string, xpAmount: number, pointsAmount: number, description: string, source: string): void {
    const employees = this.getEmployees();
    const empIdx = employees.findIndex(e => e.id === employeeId);
    if (empIdx === -1) return;

    const emp = employees[empIdx];
    emp.xp += xpAmount;
    emp.points += pointsAmount;

    // Recalculate level
    const newLevel = Math.floor(emp.xp / 500) + 1;
    emp.level = Math.max(emp.level, newLevel);

    this.setItems(STORAGE_KEYS.EMPLOYEES, employees);

    // Add XP Ledger Entry
    const ledger = this.getItems<XpLedgerEntry>(STORAGE_KEYS.XP_LEDGER);
    ledger.push({
      id: `xp-${employeeId}-${Date.now()}`,
      employeeId,
      type: 'EARN',
      amount: xpAmount,
      source,
      timestamp: new Date().toISOString(),
      description
    });
    this.setItems(STORAGE_KEYS.XP_LEDGER, ledger);
  }

  // --- Badges ---
  getBadges(): Badge[] {
    return this.getItems<Badge>(STORAGE_KEYS.BADGES);
  }

  getBadgeAwards(): BadgeAward[] {
    return this.getItems<BadgeAward>(STORAGE_KEYS.BADGE_AWARDS);
  }

  createBadgeRule(badge: Omit<Badge, 'id'>): Badge {
    const badges = this.getBadges();
    const newBadge: Badge = {
      ...badge,
      id: `bdg-${badges.length + 1}`
    };
    badges.push(newBadge);
    this.setItems(STORAGE_KEYS.BADGES, badges);
    return newBadge;
  }

  checkAndAwardBadges(employeeId: string): Badge[] {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return [];

    const badges = this.getBadges();
    const awards = this.getBadgeAwards();
    const userAwards = awards.filter(a => a.employeeId === employeeId);
    const userBadgeIds = new Set(userAwards.map(a => a.badgeId));

    const participations = this.getParticipations().filter(p => p.employeeId === employeeId && p.status === 'Completed');
    const redemptions = this.getItems<RewardRedemption>(STORAGE_KEYS.REDEMPTIONS).filter(r => r.employeeId === employeeId && r.status === 'Completed');

    // Compile employee metrics for badge logic
    const metrics: Record<string, number> = {
      xp: emp.xp,
      level: emp.level,
      challenges_completed: participations.length,
      rewards_redeemed: redemptions.length,
      carbon_saved: Math.round(participations.length * 20), // mock carbon saved per challenge
      entries_logged: Math.round(emp.xp / 100), // mock logged items
      policies_signed: 5, // mock policy compliance
      zero_waste_score: 95, // mock zero waste score
      issues_closed: 3 // mock issues closed
    };

    const newlyAwarded: Badge[] = [];

    badges.forEach(badge => {
      // Skip if already earned
      if (userBadgeIds.has(badge.id)) return;

      const userVal = metrics[badge.metric] ?? 0;
      let qualifies = false;

      switch (badge.operator) {
        case 'gt': qualifies = userVal > badge.threshold; break;
        case 'gte': qualifies = userVal >= badge.threshold; break;
        case 'lt': qualifies = userVal < badge.threshold; break;
        case 'lte': qualifies = userVal <= badge.threshold; break;
        case 'eq': qualifies = userVal === badge.threshold; break;
      }

      if (qualifies) {
        // Award badge!
        awards.push({
          id: `ba-${awards.length + 1}`,
          badgeId: badge.id,
          employeeId,
          awardedAt: new Date().toISOString()
        });

        // Award bonus points associated with badge
        emp.points += badge.pointsAward;
        newlyAwarded.push(badge);
      }
    });

    if (newlyAwarded.length > 0) {
      this.setItems(STORAGE_KEYS.BADGE_AWARDS, awards);
      // Save employee points updates too
      const employees = this.getEmployees();
      const idx = employees.findIndex(e => e.id === employeeId);
      if (idx !== -1) {
        employees[idx].points = emp.points;
        this.setItems(STORAGE_KEYS.EMPLOYEES, employees);
      }
    }

    return newlyAwarded;
  }

  // --- Rewards ---
  getRewards(): Reward[] {
    return this.getItems<Reward>(STORAGE_KEYS.REWARDS);
  }

  getRewardRedemptions(): RewardRedemption[] {
    return this.getItems<RewardRedemption>(STORAGE_KEYS.REDEMPTIONS);
  }

  redeemReward(rewardId: string, employeeId: string): { success: boolean; error?: string; redemption?: RewardRedemption } {
    const rewards = this.getRewards();
    const rIdx = rewards.findIndex(r => r.id === rewardId);
    if (rIdx === -1) return { success: false, error: 'Reward not found' };

    const reward = rewards[rIdx];
    if (reward.stock <= 0) return { success: false, error: 'This item is out of stock' };

    const employees = this.getEmployees();
    const empIdx = employees.findIndex(e => e.id === employeeId);
    if (empIdx === -1) return { success: false, error: 'Employee profile not found' };

    const emp = employees[empIdx];
    if (emp.points < reward.pointsCost) {
      return {
        success: false,
        error: `Insufficient points balance. You need ${reward.pointsCost} points, but you have ${emp.points}.`
      };
    }

    // Process redemption
    reward.stock -= 1;
    emp.points -= reward.pointsCost;

    // Save entities
    this.setItems(STORAGE_KEYS.REWARDS, rewards);
    this.setItems(STORAGE_KEYS.EMPLOYEES, employees);

    const redemptions = this.getRewardRedemptions();
    const newRedemption: RewardRedemption = {
      id: `red-${String(redemptions.length + 1).padStart(3, '0')}`,
      rewardId,
      employeeId,
      status: 'Completed',
      timestamp: new Date().toISOString(),
      pointsSpent: reward.pointsCost
    };
    redemptions.push(newRedemption);
    this.setItems(STORAGE_KEYS.REDEMPTIONS, redemptions);

    // Log in XP ledger as REDEEM
    const ledger = this.getItems<XpLedgerEntry>(STORAGE_KEYS.XP_LEDGER);
    ledger.push({
      id: `xp-${employeeId}-${Date.now()}`,
      employeeId,
      type: 'REDEEM',
      amount: reward.pointsCost,
      source: `reward-${rewardId}`,
      timestamp: new Date().toISOString(),
      description: `Redeemed ${reward.title}`
    });
    this.setItems(STORAGE_KEYS.XP_LEDGER, ledger);

    return { success: true, redemption: newRedemption };
  }

  // --- Leaderboard ---
  getLeaderboard(period: 'all' | 'monthly' = 'all', type: 'individual' | 'department' = 'individual') {
    const employees = this.getEmployees();
    
    if (type === 'individual') {
      // Sort by XP descending
      const sorted = [...employees].sort((a, b) => b.xp - a.xp);
      return sorted.map((emp, idx) => ({
        rank: idx + 1,
        employeeId: emp.id,
        name: emp.name,
        avatar: emp.avatar,
        points: emp.points,
        xp: emp.xp,
        level: emp.level,
        departmentName: this.getDepartmentNameForEmployee(emp.departmentId)
      }));
    } else {
      // Group by department
      const deptXps: Record<string, { totalXp: number; memberCount: number }> = {};
      employees.forEach(emp => {
        const deptName = this.getDepartmentNameForEmployee(emp.departmentId);
        if (!deptXps[deptName]) {
          deptXps[deptName] = { totalXp: 0, memberCount: 0 };
        }
        deptXps[deptName].totalXp += emp.xp;
        deptXps[deptName].memberCount += 1;
      });

      const deptsArray = Object.entries(deptXps).map(([deptName, data]) => ({
        name: deptName,
        xp: Math.round(data.totalXp / (data.memberCount || 1)), // Average XP per department member for fairness
        totalXp: data.totalXp,
        memberCount: data.memberCount
      }));

      // Sort by average XP
      const sorted = deptsArray.sort((a, b) => b.xp - a.xp);
      return sorted.map((dept, idx) => ({
        rank: idx + 1,
        name: dept.name,
        xp: dept.xp,
        totalXp: dept.totalXp,
        memberCount: dept.memberCount
      }));
    }
  }

  private getDepartmentNameForEmployee(deptId: string): string {
    const departments: Record<string, string> = {
      'dept-1': 'Human Resources',
      'dept-2': 'Engineering',
      'dept-3': 'Procurement',
      'dept-4': 'Legal & Compliance',
      'dept-5': 'Operations',
      'dept-6': 'Logistics'
    };
    return departments[deptId] || 'Corporate';
  }
}

export const gamificationService = new GamificationService();
