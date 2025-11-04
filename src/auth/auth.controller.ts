import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    console.log('\n🚀 [CONTROLLER] POST /auth/login - Mobile app connecting...\n');
    const result = await this.authService.login(loginDto);
    console.log('\n✅ [CONTROLLER] Login completed, sending response to mobile\n');
    return result;
  }
}
