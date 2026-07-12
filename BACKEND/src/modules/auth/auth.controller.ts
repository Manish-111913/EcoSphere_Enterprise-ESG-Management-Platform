import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Put,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@SkipAudit() // auth flows self-audit and carry tokens; never generic-audit them
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @HttpCode(200)
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.auth.login(dto, { ip, userAgent: ua });
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @HttpCode(200)
  @Post('logout')
  logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.me(user);
  }

  @HttpCode(200)
  @Put('change-password')
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.auth.changePassword(user, dto, { ip, userAgent: ua });
  }

  @Public()
  @Get('signup-options')
  signupOptions() {
    return this.auth.signupOptions();
  }

  @Public()
  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.auth.register(dto, { ip, userAgent: ua });
  }

  @Public()
  @HttpCode(200)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.auth.resetPassword(dto, { ip, userAgent: ua });
  }
}
