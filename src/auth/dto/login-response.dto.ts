export class LoginResponseDto {
  accessToken: string;
  user: {
    id: number;
    privyUserId: string;
    walletAddress: string;
    email?: string;
    name?: string;
  };
}
