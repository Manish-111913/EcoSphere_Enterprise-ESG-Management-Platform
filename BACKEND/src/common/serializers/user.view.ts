import { Prisma } from '@prisma/client';

export interface UserView {
  id: string;
  employeeCode: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId: string;
  designation: string | null;
  isActive: boolean;
  emailVerified: boolean;
  joinDate: Date | null;
  lastLoginAt: Date | null;
  roles: string[];
  createdAt: Date;
}

type UserWithRoles = Prisma.UserGetPayload<{
  include: { userRoles: { include: { role: true } } };
}>;

/** Safe projection of a user — never exposes password_hash. */
export function toUserView(user: UserWithRoles): UserView {
  return {
    id: user.id,
    employeeCode: user.employeeCode,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    departmentId: user.departmentId,
    designation: user.designation,
    isActive: user.isActive,
    emailVerified: user.emailVerifiedAt !== null,
    joinDate: user.joinDate,
    lastLoginAt: user.lastLoginAt,
    roles: user.userRoles.map((ur) => ur.role.name),
    createdAt: user.createdAt,
  };
}
