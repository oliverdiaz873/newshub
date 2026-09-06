import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 1000 }])],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
