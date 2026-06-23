export type MinecraftProfile = {
  id: string;
  name: string;
  skins?: Array<{
    id?: string;
    state?: string;
    url?: string;
    variant?: string;
  }>;
};

export type MinecraftIdentity = {
  username: string;
  uuid: string;
  avatarUrl: string | null;
  skinUrl: string | null;
  verified: boolean;
};

export type UserRoleType = "CUSTOMER" | "EMPLOYEE" | "SUPER_ADMIN";

export type HubMCSessionUser = {
  minecraftUsername: string | null;
  minecraftUuid: string | null;
  minecraftAvatarUrl: string | null;
  minecraftSkinUrl: string | null;
  customerId: string | null;
  role: UserRoleType;
  employeeId: string | null;
  email: string | null;
  verified: boolean;
  fullName: string | null;
  phoneNumber: string | null;
  authProvider: string | null;
};

export type HubMCSession = {
  user: HubMCSessionUser;
  expires: string;
};
