import { PrismaClient, Platform } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Step 1: Create all permissions
  console.log("Creating permissions...");
  const permissionsData = [
    // Workspace management
    { resource: "workspace", action: "read", description: "View workspace details" },
    { resource: "workspace", action: "update", description: "Edit workspace settings" },
    { resource: "workspace", action: "delete", description: "Delete workspace" },

    // Member management
    { resource: "members", action: "read", description: "View workspace members" },
    { resource: "members", action: "create", description: "Invite new members" },
    { resource: "members", action: "update", description: "Update member roles" },
    { resource: "members", action: "delete", description: "Remove members" },

    // Social account management
    { resource: "social_accounts", action: "read", description: "View connected accounts" },
    { resource: "social_accounts", action: "create", description: "Connect new accounts" },
    { resource: "social_accounts", action: "update", description: "Update account settings" },
    { resource: "social_accounts", action: "delete", description: "Disconnect accounts" },

    // Post management
    { resource: "posts", action: "read", description: "View posts" },
    { resource: "posts", action: "create", description: "Create new posts" },
    { resource: "posts", action: "update", description: "Edit posts" },
    { resource: "posts", action: "delete", description: "Delete posts" },
    { resource: "posts", action: "approve_content", description: "Approve post content" },
    { resource: "posts", action: "approve_images", description: "Approve post images" },
    { resource: "posts", action: "publish", description: "Publish posts" },

    // Schedule management
    { resource: "schedules", action: "read", description: "View schedules" },
    { resource: "schedules", action: "create", description: "Create schedules" },
    { resource: "schedules", action: "update", description: "Edit schedules" },
    { resource: "schedules", action: "delete", description: "Delete schedules" },

    // Template management
    { resource: "templates", action: "read", description: "View templates" },
    { resource: "templates", action: "create", description: "Create templates" },
    { resource: "templates", action: "update", description: "Edit templates" },
    { resource: "templates", action: "delete", description: "Delete templates" },

    // Analytics
    { resource: "analytics", action: "read", description: "View analytics and reports" },
  ];

  const permissions = await Promise.all(
    permissionsData.map((permission) =>
      prisma.permission.upsert({
        where: {
          resource_action: {
            resource: permission.resource,
            action: permission.action,
          },
        },
        update: {},
        create: permission,
      })
    )
  );

  console.log(`✅ Created ${permissions.length} permissions`);

  // Step 2: Create system roles
  console.log("Creating system roles...");

  // Create system roles without permissions first
  const systemRolesData = [
    {
      name: "owner",
      description: "Full access to all workspace features",
      isSystem: true,
    },
    {
      name: "admin",
      description: "Can manage workspace settings and members",
      isSystem: true,
    },
    {
      name: "editor",
      description: "Can create and manage content",
      isSystem: true,
    },
    {
      name: "contributor",
      description: "Can create content but needs approval",
      isSystem: true,
    },
    {
      name: "viewer",
      description: "Read-only access",
      isSystem: true,
    },
  ];

  const systemRoles: any[] = [];

  // Create system roles one by one to handle the unique constraint issue
  for (const roleData of systemRolesData) {
    try {
      // First check if it exists
      let role = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          isSystem: true,
        },
      });

      if (!role) {
        // Create if it doesn't exist
        role = await prisma.role.create({
          data: roleData,
        });
        console.log(`Created system role: ${role.name}`);
      } else {
        console.log(`System role already exists: ${role.name}`);
      }

      systemRoles.push(role);
    } catch (error) {
      console.error(`Error creating role ${roleData.name}:`, error);
      // If there's a unique constraint error, try to find the existing role
      const existingRole = await prisma.role.findFirst({
        where: {
          name: roleData.name,
          isSystem: true,
        },
      });
      if (existingRole) {
        systemRoles.push(existingRole);
      }
    }
  }

  console.log(`✅ Ensured ${systemRoles.length} system roles exist`);

  // Step 3: Assign permissions to roles
  console.log("Assigning permissions to roles...");

  // Helper function to get permission IDs by pattern
  const getPermissionIds = (patterns: string[]) => {
    return permissions
      .filter((p) =>
        patterns.some((pattern) => {
          if (pattern === "*") return true;
          if (pattern.includes(":*")) {
            const [resource] = pattern.split(":");
            return p.resource === resource;
          }
          const [resource, action] = pattern.split(":");
          return p.resource === resource && p.action === action;
        })
      )
      .map((p) => p.id);
  };

  // Role permission assignments
  const rolePermissionAssignments = [
    {
      roleName: "owner",
      permissionPatterns: ["*"], // All permissions
    },
    {
      roleName: "admin",
      permissionPatterns: [
        "workspace:read",
        "workspace:update",
        "members:*",
        "social_accounts:*",
        "posts:*",
        "schedules:*",
        "templates:*",
        "analytics:read",
      ],
    },
    {
      roleName: "editor",
      permissionPatterns: [
        "workspace:read",
        "members:read",
        "social_accounts:read",
        "posts:*",
        "schedules:read",
        "schedules:create",
        "schedules:update",
        "templates:*",
        "analytics:read",
      ],
    },
    {
      roleName: "contributor",
      permissionPatterns: [
        "workspace:read",
        "members:read",
        "social_accounts:read",
        "posts:read",
        "posts:create",
        "posts:update",
        "schedules:read",
        "templates:read",
      ],
    },
    {
      roleName: "viewer",
      permissionPatterns: [
        "workspace:read",
        "members:read",
        "social_accounts:read",
        "posts:read",
        "schedules:read",
        "templates:read",
        "analytics:read",
      ],
    },
  ];

  for (const assignment of rolePermissionAssignments) {
    const role = systemRoles.find((r) => r.name === assignment.roleName);
    if (!role) continue;

    const permissionIds = getPermissionIds(assignment.permissionPatterns);

    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  console.log("✅ Assigned permissions to roles");

  // Step 4: Create test users
  console.log("Creating test users...");

  const testUsers = [
    {
      email: "admin@admin.com",
      name: "super admin",
      password: "admin123",
      isSuperAdmin:true,
    },
    {
      email: "owner@promowaves.com",
      name: "John Owner",
      password: "OwnerPass123!",
      role: "owner",
    },
    {
      email: "admin@promowaves.com",
      name: "Sarah Admin",
      password: "AdminPass123!",
      role: "admin",
    },
    {
      email: "editor@promowaves.com",
      name: "Mike Editor",
      password: "EditorPass123!",
      role: "editor",
    },
    {
      email: "contributor@promowaves.com",
      name: "Lisa Contributor",
      password: "ContribPass123!",
      role: "contributor",
    },
    {
      email: "viewer@promowaves.com",
      name: "Tom Viewer",
      password: "ViewerPass123!",
      role: "viewer",
    },
  ];

  const users = await Promise.all(
    testUsers.map(async (userData) => {
      const hashedPassword = await hash(userData.password, 12);
      return prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          isSuperAdmin:userData.isSuperAdmin ?? false,
          email: userData.email,
          name: userData.name,
          hashedPassword,
          emailVerified: new Date(), // Mark as verified for testing
        },
      });
    })
  );

  console.log(`✅ Created ${users.length} test users`);

  // Step 5: Create PromoWaves workspace
  console.log("Creating PromoWaves workspace...");

  const workspace = await prisma.workspace.upsert({
    where: { slug: "promowaves" },
    update: {},
    create: {
      name: "PromoWaves",
      slug: "promowaves",
      description: "The ultimate social media management platform for growing your brand",
      logoUrl: "https://promowaves.net/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flogo_close_beta.4fedd7a9.png&w=384&q=75", // Update with actual logo
    },
  });

  console.log("✅ Created PromoWaves workspace");

  // Step 6: Add users to workspace with their respective roles
  console.log("Adding users to workspace...");

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const testUser = testUsers[i];
    const role = systemRoles.find((r) => r.name === testUser?.role);

    if (role && user) {
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: user.id,
          },
        },
        update: {},
        create: {
          workspaceId: workspace.id,
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  console.log("✅ Added all users to workspace");

  // Step 7: Create sample data for the workspace
  console.log("Creating sample data...");

  // Create post templates
  const templates = await Promise.all([
    prisma.postTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Product Launch",
        description: "Template for announcing new product launches",
        content: "🚀 Exciting news! We're thrilled to introduce [PRODUCT_NAME] - [PRODUCT_DESCRIPTION]\n\n✨ Key Features:\n- [FEATURE_1]\n- [FEATURE_2]\n- [FEATURE_3]\n\n🔗 Learn more: [LINK]\n\n#NewProduct #Innovation #TechLaunch",
        hashtags: ["NewProduct", "Innovation", "TechLaunch", "ProductLaunch"],
        platforms: [Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN],
      },
    }),
    prisma.postTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Weekly Tips",
        description: "Template for sharing weekly tips and insights",
        content: "💡 Weekly Tip: [TIP_TITLE]\n\n[TIP_CONTENT]\n\nWhat's your favorite productivity hack? Share in the comments! 👇\n\n#WeeklyTips #Productivity #LifeHacks",
        hashtags: ["WeeklyTips", "Productivity", "LifeHacks", "TipsAndTricks"],
        platforms: [Platform.INSTAGRAM, Platform.FACEBOOK],
      },
    }),
    prisma.postTemplate.create({
      data: {
        workspaceId: workspace.id,
        name: "Company Update",
        description: "Template for sharing company news and updates",
        content: "📢 Company Update\n\n[UPDATE_CONTENT]\n\nWe're grateful for your continued support as we grow and evolve. Stay tuned for more exciting developments!\n\n#CompanyNews #Updates #Growth",
        hashtags: ["CompanyNews", "Updates", "Growth", "BusinessUpdate"],
        platforms: [Platform.LINKEDIN, Platform.FACEBOOK],
      },
    }),
  ]);

  console.log(`✅ Created ${templates.length} post templates`);

  // Create a sample schedule
  const schedule = await prisma.postSchedule.create({
    data: {
      workspaceId: workspace.id,
      name: "Weekly Content Calendar",
      description: "Regular posting schedule for consistent engagement",
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      frequency: "WEEKLY",
      weekDays: [1, 3, 5], // Monday, Wednesday, Friday
      timeSlots: ["09:00", "14:00", "18:00"],
      platforms: [Platform.INSTAGRAM, Platform.FACEBOOK],
      postsPerSlot: 1,
      contentPrompt: "Create engaging social media content about digital marketing, social media tips, and brand growth strategies",
      hashtags: ["SocialMedia", "DigitalMarketing", "BrandGrowth"],
    },
  });

  console.log("✅ Created sample schedule");

  // Step 8: Display seed summary
  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`- Permissions: ${permissions.length}`);
  console.log(`- System Roles: ${systemRoles.length}`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`- Templates: ${templates.length}`);
  console.log(`- Schedules: 1`);

  console.log("\n👤 Test Users (email : password):");
  testUsers.forEach((user) => {
    console.log(`- ${user.email} : ${user.password} (${user.role})`);
  });

  console.log("\n🔗 Access the workspace at: /workspace/promowaves");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });