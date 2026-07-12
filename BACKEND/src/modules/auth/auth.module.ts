import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [AuthController, InvitationsController],
  providers: [AuthService, TokenService, InvitationsService],
  exports: [TokenService],
})
export class AuthModule {}
