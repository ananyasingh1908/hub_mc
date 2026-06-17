import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMPLOYEE_EMAIL = "prabhatenterprises201@gmail.com";
const EMPLOYEE_DISPLAY_NAME = "Prabhat Enterprises";
const EMPLOYEE_DEPARTMENT = "Support";

async function main() {
  console.log(`[seed] Checking employee: ${EMPLOYEE_EMAIL}`);

  const existing = await prisma.user.findUnique({
    where: { email: EMPLOYEE_EMAIL },
    include: { employee: { include: { permissions: true } } },
  });

  if (existing?.employee) {
    console.log("[seed] Employee already exists. Ensuring full permissions...");
    if (existing.employee.permissions) {
      await prisma.rolePermission.update({
        where: { id: existing.employee.permissions.id },
        data: {
          products: true,
          orders: true,
          support: true,
          customers: true,
          tournaments: true,
          notifications: true,
          playerManage: true,
          platformLogs: true,
          employeeMonitor: true,
        },
      });
    } else {
      await prisma.rolePermission.create({
        data: {
          employeeId: existing.employee.id,
          products: true,
          orders: true,
          support: true,
          customers: true,
          tournaments: true,
          notifications: true,
          playerManage: true,
          platformLogs: true,
          employeeMonitor: true,
        },
      });
    }
    if (existing.role !== "EMPLOYEE") {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "EMPLOYEE" },
      });
    }
    if (!existing.employee.isActive) {
      await prisma.employee.update({
        where: { id: existing.employee.id },
        data: { isActive: true, disabledAt: null },
      });
    }
    console.log("[seed] Employee updated successfully.");
    console.log(`[seed]   User ID:     ${existing.id}`);
    console.log(`[seed]   Employee ID: ${existing.employee.id}`);
    console.log(`[seed]   Role:        EMPLOYEE`);
    return;
  }

  if (existing && !existing.employee) {
    console.log("[seed] User exists but no Employee record. Creating one...");
    const employee = await prisma.employee.create({
      data: {
        userId: existing.id,
        displayName: EMPLOYEE_DISPLAY_NAME,
        department: EMPLOYEE_DEPARTMENT,
        permissions: {
          create: {
            products: true,
            orders: true,
            support: true,
            customers: true,
            tournaments: true,
            notifications: true,
            playerManage: true,
            platformLogs: true,
            employeeMonitor: true,
          },
        },
      },
    });
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "EMPLOYEE" },
    });
    console.log("[seed] Employee created for existing user.");
    console.log(`[seed]   User ID:     ${existing.id}`);
    console.log(`[seed]   Employee ID: ${employee.id}`);
    return;
  }

  console.log("[seed] No existing user found. Creating new User + Employee...");
  const user = await prisma.user.create({
    data: {
      email: EMPLOYEE_EMAIL,
      name: EMPLOYEE_DISPLAY_NAME,
      role: "EMPLOYEE",
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      displayName: EMPLOYEE_DISPLAY_NAME,
      department: EMPLOYEE_DEPARTMENT,
      permissions: {
        create: {
          products: true,
          orders: true,
          support: true,
          customers: true,
          tournaments: true,
          notifications: true,
          playerManage: true,
          platformLogs: true,
          employeeMonitor: true,
        },
      },
    },
  });

  console.log("[seed] Employee created successfully.");
  console.log(`[seed]   User ID:     ${user.id}`);
  console.log(`[seed]   Employee ID: ${employee.id}`);
  console.log(`[seed]   Role:        EMPLOYEE`);
}

main()
  .catch((e) => {
    console.error("[seed] Failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
