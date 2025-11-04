import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req) {
    // The user payload from JWT is attached to request by AuthGuard
    const userId = req.user.sub;
    return this.userService.findById(userId);
  }
}
