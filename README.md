
sudo apt install wireguard
sudo apt install npm
sudo apt install zip

sudo -i

cd /etc/wireguard &&
umask 077 &&
sudo wg genkey | sudo tee server.key | wg pubkey | sudo tee server.pub &&
SERVER_PRIV=$(sudo cat server.key) &&
sudo tee /etc/wireguard/wg0.conf >/dev/null <<EOF
[Interface]
Address = 10.10.0.1/16
ListenPort = 51820
PrivateKey = $SERVER_PRIV
EOF


sudo chmod 600 /etc/wireguard/server.key /etc/wireguard/wg0.conf &&
sudo systemctl enable wg-quick@wg0 &&
sudo systemctl start wg-quick@wg0 &&
sudo wg show

exit


PEER_NAME=initial
PEER_IP=10.10.5.2/16

PRIV=$(wg genkey)
PUB=$(echo "$PRIV" | wg pubkey)

sudo bash -c "wg set wg0 peer $PUB allowed-ips $PEER_IP"

cat >"${PEER_NAME}.conf"<<CFG
[Interface]
PrivateKey = ${PRIV}
Address = ${PEER_IP}
DNS = 1.1.1.1

[Peer]
PublicKey = $(sudo wg show wg0 public-key)
Endpoint = $(curl -s ifconfig.me):51820
AllowedIPs = 10.10.0.0/16
PersistentKeepalive = 25
CFG

cat initial.conf


sudo install -m 0755 -d /etc/apt/keyrings && \
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && \
sudo apt update && \
sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin && \
sudo usermod -aG docker $USER && \
newgrp docker



mkdir zbox && cd zbox && \
cat > docker-compose.yml <<'YAML'
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: keycloak_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloakpass
    volumes:
      - keycloak_data:/var/lib/postgresql/data
    networks:
      - keycloak_net

  keycloak:
    image: quay.io/keycloak/keycloak:25.0.2
    container_name: keycloak
    command:
      - start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL_HOST: postgres
      KC_DB_URL_DATABASE: keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloakpass
      KC_HTTP_PORT: 8080
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin123
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    networks:
      - keycloak_net

volumes:
  keycloak_data:

networks:
  keycloak_net:
YAML

docker compose up -d


Step-by-Step Keycloak Realm Configuration
1. Access Keycloak Admin Console
After starting Keycloak with Docker Compose, navigate to:

text
http://your-server-ip:8080
First-time login: Username = admin, Password = check your docker-compose.yml or Keycloak logs

2. Create a New Realm
In the top-left dropdown, click on the current realm name (default: "Master")

Click "Add realm" button

Fill in the realm details:

Realm name: z-box

Display name: Z-Box VPN Realm

Enabled: ON

Click Create

3. Configure Realm Settings
Navigate to Realm Settings in the left sidebar:

General Tab:
Name: z-box

Display name: Z-Box VPN Realm

HTML Display name: <b>Z-Box</b> VPN

Supported locales: Add any languages needed

User-managed access: OFF

Login Tab:
User registration: OFF (we'll create users manually)

Forgot password: ON

Remember me: OFF

Verify email: OFF (for prototype, enable for production)

Login with email: ON

Themes Tab:
Login theme: keycloak (default)

Account theme: keycloak

4. Create a Client for Z-Box Admin Portal
Go to Clients in the left sidebar and click Create:

Basic Settings:
Client ID: z-box-admin-portal

Client Protocol: openid-connect

Root URL: http://your-server-ip:3000 (your Node.js app URL)

Capability Config:
Client authentication: ON

Authorization: OFF (for simplicity in prototype)

Standard flow: ON

Direct access grants: OFF

Implicit flow: OFF

Access Settings:
Valid redirect URIs:

text
http://your-server-ip:3000/*
http://localhost:3000/*
Web origins:

text
http://your-server-ip:3000
http://localhost:3000
Admin URL: http://your-server-ip:3000

Advanced Settings (in Client > Settings):
Access Token Lifespan: 5 minutes (good for security)

Proof Key for Code Exchange (PKCE): ON (recommended)

5. Configure Client Scopes
Go to Client scopes and assign to your client:

Default Client Scopes:

openid

profile

email

roles

Optional Client Scopes:

offline_access (if you need refresh tokens)

6. Create User Roles
Navigate to Realm roles and create:

Click "Create role":

Role name: z-box-user

Description: Standard Z-Box VPN user

Create additional roles:

Role name: z-box-admin

Description: Z-Box administrator

7. Create User Accounts for Team Members
Go to Users in the left sidebar and click Add user:

For each team member (e.g., Haseeb Alvi):
User Details:

Username: halvi (or haseeb.alvi)

Email: haseeb@example.com

First name: Haseeb

Last name: Alvi

Email verified: ON

User enabled: ON

Set Credentials:
Click on the Credentials tab for the user:

Password: Set a temporary password

Temporary: ON (user will change on first login)

Type: Password

Assign Roles:
Click on the Role mappings tab:

In Available roles, select z-box-user and z-box-admin

Click Add selected

Repeat for all team members:

Username: schishti (Shahique Chishti)

Username: shamza (Syes Hamza Saad)

Username: mzain (M. Zain)











sudo -i

sudo mkdir -p /etc/nftables.d

sudo bash -c 'cat >/etc/nftables.d/firewall.nft <<EOF
table inet firewall {
    define WAN_IF = ens4

    chain input {
        type filter hook input priority 0;

        iif "lo" accept
        ct state established,related accept

        iif \$WAN_IF tcp dport 22 accept
        iif \$WAN_IF udp dport 51820 accept

        iif \$WAN_IF drop
    }
}
EOF
'

sudo bash -c 'cat >/etc/nftables.d/zbox.nft <<EOF
table inet zbox {
    set compliant_peers {
        type ipv4_addr
        flags interval
    }

    set quarantine_peers {
        type ipv4_addr
        flags interval
    }

    chain wg0-in {
        type filter hook input priority 0;

        iif "wg0" ip saddr @compliant_peers accept

        iif "wg0" ip saddr @quarantine_peers tcp dport 3000 accept
        iif "wg0" ip saddr @quarantine_peers udp dport 53 accept
        iif "wg0" ip saddr @quarantine_peers tcp dport 53 accept

        iif "wg0" drop
    }
}
EOF
'

sudo bash -c 'cat >/etc/nftables.conf <<EOF
#!/usr/sbin/nft -f
include "/etc/nftables.d/firewall.nft"
include "/etc/nftables.d/zbox.nft"
EOF
'

sudo bash -c 'cat >/usr/local/sbin/zbox-allow.sh <<'"'"'EOF'"'"'
#!/bin/bash
IP="$1"
if [ -z "$IP" ]; then
  echo "usage: $0 10.10.5.2"
  exit 1
fi
nft add element inet zbox compliant_peers { $IP } 2>/dev/null || true
nft delete element inet zbox quarantine_peers { $IP } 2>/dev/null || true
EOF
'

sudo bash -c 'cat >/usr/local/sbin/zbox-quarantine.sh <<'"'"'EOF'"'"'
#!/bin/bash
IP="$1"
if [ -z "$IP" ]; then
  echo "usage: $0 10.10.5.2"
  exit 1
fi
nft add element inet zbox quarantine_peers { $IP } 2>/dev/null || true
nft delete element inet zbox compliant_peers { $IP } 2>/dev/null || true
EOF
'

sudo chmod +x /usr/local/sbin/zbox-allow.sh /usr/local/sbin/zbox-quarantine.sh

sudo nft -f /etc/nftables.conf
sudo nft list ruleset

## In case of changes
sudo nft delete table inet firewall
sudo nft delete table inet zbox
sudo nft -f /etc/nftables.conf




git add .
git commit -m "fixes"
git push

cd ..
cd ..
rm -rf zbox
git clone https://github.com/Hanslace/Z-Box.git zbox
cd zbox
cd admin
npm install
mv .env.example .env
sudo npm run dev
