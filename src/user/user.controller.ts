import {
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  Request,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@Request() req) {
    console.log('📖 [USER] GET /user/me - Fetching profile for user:', req.user.sub);
    // The user payload from JWT is attached to request by AuthGuard
    const userId = req.user.sub;

    // Update stats before returning user profile
    await this.userService.updateUserStats(userId);

    const user = await this.userService.findById(userId);
    console.log('✅ [USER] Profile fetched successfully');
    return user;
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    const userId = req.user.sub;
    console.log('✏️  [USER] PATCH /user/me - Updating profile for user:', userId);
    console.log('📝 [USER] Update data:', updateDto);

    const updatedUser = await this.userService.update(userId, updateDto);
    console.log('✅ [USER] Profile updated successfully');
    return updatedUser;
  }

  @Post('avatar')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, callback) => {
          // Generate unique filename: userId-timestamp.ext
          const userId = req['user']?.sub;
          const uniqueSuffix = Date.now();
          const ext = extname(file.originalname);
          const filename = `${userId}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
      },
      fileFilter: (req, file, callback) => {
        // Only allow images
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.sub;
    console.log('📸 [USER] POST /user/avatar - Uploading avatar for user:', userId);

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    console.log('✅ [USER] Avatar uploaded:', file.filename);

    // Return the URL path to the uploaded file
    // In production, you'd use a CDN or cloud storage URL
    const avatarUrl = `/uploads/avatars/${file.filename}`;

    return {
      avatarUrl,
      message: 'Avatar uploaded successfully',
    };
  }
}
