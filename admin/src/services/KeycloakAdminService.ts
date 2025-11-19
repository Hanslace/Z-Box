import axios from "axios";

export class KeycloakAdminService {
  private baseUrl: string;
  private realm: string;
  private adminUser: string;
  private adminPass: string;

  constructor() {
    this.baseUrl = process.env.KEYCLOAK_ADMIN_URL || "http://10.10.0.1:8080";
    this.realm = process.env.KEYCLOAK_REALM || "z-box";
    this.adminUser = process.env.KEYCLOAK_ADMIN_USER || "admin";
    this.adminPass = process.env.KEYCLOAK_ADMIN_PASS || "admin123";
  }

  private async getAdminToken(): Promise<string> {
    const url = `${this.baseUrl}/realms/master/protocol/openid-connect/token`;
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("client_id", "admin-cli");
    params.append("username", this.adminUser);
    params.append("password", this.adminPass);

    const res = await axios.post(url, params);
    return res.data.access_token;
  }

  private async getRoleId(token: string, roleName: string) {
    const url = `${this.baseUrl}/admin/realms/${this.realm}/roles/${roleName}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data; // roleRepresentation
  }

  private async assignRoleToUser(
    token: string,
    userId: string,
    roleRep: any
  ): Promise<void> {

    const url = `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`;

    await axios.post(url, [roleRep], {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async createUser(email: string, tempPassword: string): Promise<string> {
    const token = await this.getAdminToken();

    // Create user
    const url = `${this.baseUrl}/admin/realms/${this.realm}/users`;
    const userPayload = {
      username: email,
      email: email,
      enabled: true,
      emailVerified: true,
      credentials: [
        {
          type: "password",
          value: tempPassword,
          temporary: true,
        },
      ],
    };

    const res = await axios.post(url, userPayload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const location = res.headers["location"] as string;
    const userId = location.split("/").pop() as string;

    // --- NEW: assign role "z-box-user"
    const roleRep = await this.getRoleId(token, "z-box-user");
    await this.assignRoleToUser(token, userId, roleRep);

    return userId;
  }
}
