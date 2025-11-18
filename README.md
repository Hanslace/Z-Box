````markdown
# Z-Box

Z-Box is a **posture-aware WireGuard VPN gateway** for small teams.

It runs on a single Linux host and combines:

- WireGuard (`wg0`) as the transport VPN
- `nftables` firewall with **compliant** and **quarantine** peer sets
- A Node.js **Admin Portal** for peer + posture management
- A Python **client_posture** agent for manual compliance checks
- Keycloak for SSO / identity
- Prometheus + Grafana for metrics and dashboards
- A sample SSO-protected Next.js app (**Math Wiz**) running behind the VPN

The goal: **only posture-verified devices become fully “compliant” peers**, everyone else is either blocked or stuck in a limited quarantine network until reviewed.

---

## 1. High-level architecture

**On the Z-Box host (Ubuntu)**

- **WireGuard `wg0`**
  - Network: `10.10.0.0/16`
  - Server address: `10.10.0.1/16`
  - UDP port: `51820`
- **nftables**
  - Table `inet firewall`: locks down the public/WAN interface, only `ssh` + `wireguard` from the Internet
  - Table `inet zbox`:
    - `set compliant_peers` – IPs allowed to reach internal services
    - `set quarantine_peers` – IPs allowed only to reach onboarding/limited services
    - `chain wg0-in` – filters **all** traffic arriving via `wg0` using these sets
- **Docker stack**
  - `keycloak` (+ `postgres`) – realm, clients, roles, SSO
  - `admin` – Node.js Admin Portal for peer + posture review, runs on host network
  - `math_wiz` – Next.js calculator app, SSO-protected via Keycloak
  - `prometheus` – metrics collection
  - `grafana` – dashboards
  - `node_exporter` – host metrics
  - `wg_exporter` – WireGuard metrics

**On the client machine**

- WireGuard client using the generated `initial.conf`
- Python **client_posture** script from `client_posture/`:
  - Collects local “posture” info (OS, basic security checks, etc.)
  - Sends JSON posture to the Admin Portal
  - The Admin then decides to mark the peer as compliant or keep/quarantine it

---

## 2. Core security model

### 2.1 Transport vs access

- WireGuard handles **encryption + identity** (keys, tunnels, IPs).
- **Access (who can reach what)** is enforced entirely by `nftables`:
  - Peers not in **any set**: `wg0-in` drops all their traffic.
  - Peers in `quarantine_peers`:
    - Can access _only_ specific ports (by default 3000, 4000, 53) on `wg0`/host.
    - Enough to talk to the Admin Portal and onboarding apps + DNS.
  - Peers in `compliant_peers`:
    - Allowed to reach all internal services you choose to expose via `wg0`.

### 2.2 Manual compliance gate

- New peer = **not trusted by default**
- Client runs `client_posture` → admin sees posture → admin moves IP to `compliant_peers`
- Automation is intentionally not done in this prototype; **humans stay in the loop**.

---

## 3. Repository layout

At the root of `Z-Box`:

- `docker-compose.yml`  
  Orchestrates:
  - `postgres` (Keycloak DB)
  - `keycloak` (Auth)
  - `admin` (Admin Portal)
  - `math_wiz` (Next.js app)
  - `prometheus`, `grafana`
  - `node_exporter`
  - `wg_exporter`

- `admin/`  
  Node.js / TypeScript Admin Portal:
  - Receives posture posts from `client_posture`
  - Lists peers and their posture
  - Provides actions like “Allow” / “Quarantine”
  - Shells out to `/usr/local/sbin/zbox-allow.sh` and `/usr/local/sbin/zbox-quarantine.sh` to update `nftables` sets

- `client_posture/`  
  Python 3 project:
  - CLI script for users to submit their posture to Z-Box
  - Sends data to the Admin Portal’s REST endpoint
  - Supports basic flags (server URL, peer ID, etc. – see `--help` in the project)

- `mathwiz/`  
  Next.js (App Router) “Math Wiz” calculator:
  - Frontend you already built
  - Integrated with **next-auth** + **KeycloakProvider**
  - Only usable when a valid Keycloak session exists
  - Runs inside the VPN (exposed only on `wg0`, not to the Internet)

- `monitoring/`
  - `prometheus.yml` with jobs for:
    - `prometheus` itself
    - `node_exporter`
    - `zbox-admin`
    - `wg_exporter`
  - Grafana dashboards can be imported here (JSON) or managed via UI

- `misc/` or docs/ (depending on your layout)
  - Extra READMEs, bootstrap instructions, etc.

---

## 4. End-to-end workflow

### 4.1 Host bootstrap (summary)

On a fresh Ubuntu VM:

1. Install base tools:
   - `wireguard`
   - `npm`
   - `zip`
   - Docker Engine + docker compose plugin

2. Create WireGuard server:

   - Generate keys and `/etc/wireguard/wg0.conf`:

     - Interface address: `10.10.0.1/16`
     - Port: `51820`
     - PrivateKey: generated `server.key`

   - Enable and start:

     - `systemctl enable wg-quick@wg0`
     - `systemctl start wg-quick@wg0`
     - Confirm: `wg show`

3. Create the **first peer**:

   - Generate peer keypair
   - Add peer to `wg0`:

     - `wg set wg0 peer <peer_pubkey> allowed-ips 10.10.5.2/32`

   - Write `initial.conf` for the client including:
     - `[Interface]` with `PrivateKey`, `Address` = `10.10.5.2/32`, `DNS = 1.1.1.1`
     - `[Peer]` with server’s public key, `Endpoint = <public-ip>:51820`, `AllowedIPs = 10.10.0.0/16`, `PersistentKeepalive = 25`

4. Install Docker Engine + compose plugin (Docker’s official repo), then:

   - `mkdir zbox && cd zbox`
   - Drop `docker-compose.yml`
   - `docker compose up -d`

Result:

- Keycloak at `http://<server-ip>:8080`
- Admin Portal (on host network, internal)
- Grafana at `http://<server-ip>:3001`
- Prometheus at `http://<server-ip>:9090`
- Math Wiz (Next.js) inside Docker, reachable on its container port via `wg0`

---

### 4.2 Keycloak realm and clients

Within Keycloak:

1. Create realm **`z-box`**
2. Realm settings:
   - Disable public self-registration
   - Enable “Forgot password” etc. as needed
3. Create roles:
   - `z-box-user`
   - `z-box-admin`
4. Create users for your team and assign roles.
5. Register clients:
   - `z-box-admin-portal` for the Admin Portal
   - `calc-app` for the Math Wiz Next.js app

In Math Wiz, you configured `next-auth` with:

- `issuer: "http://10.10.0.1:8080/realms/zbox"`
- `clientId: "calc-app"`
- Public client (no client secret)

---

### 4.3 nftables policy

Two main files:

1. `/etc/nftables.d/firewall.nft`

   - WAN interface definition:

     ```nft
     table inet firewall {
         define WAN_IF = ens4

         chain input {
             type filter hook input priority 0;

             iif "lo" accept
             ct state established,related accept

             iif $WAN_IF tcp dport 22 accept
             iif $WAN_IF udp dport 51820 accept

             iif $WAN_IF drop
         }
     }
     ```

   - This makes the public NIC effectively “WireGuard + SSH only”.

2. `/etc/nftables.d/zbox.nft`

   - Sets and chain:

     ```nft
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
             iif "wg0" ip saddr @quarantine_peers tcp dport 4000 accept
             iif "wg0" ip saddr @quarantine_peers udp dport 53 accept
             iif "wg0" ip saddr @quarantine_peers tcp dport 53 accept

             iif "wg0" drop
         }
     }
     ```

   - `wg0` traffic:
     - Compliant peers: allowed through (you can add more rules/services later).
     - Quarantine peers: can only reach `3000` (Admin), `4000` (onboarding/app), `53` (DNS).

Combined config:

```bash
sudo bash -c 'cat >/etc/nftables.conf <<EOF
#!/usr/sbin/nft -f
include "/etc/nftables.d/firewall.nft"
include "/etc/nftables.d/zbox.nft"
EOF
'

sudo nft -f /etc/nftables.conf
sudo nft list ruleset
````

---

## 5. Manual compliance via Python posture script

This is the core “Zero-Trust style” flow.

### 5.1 Default state

1. Admin creates a new WireGuard peer with address, e.g. `10.10.5.2/32`.
2. Peer is **not** in `compliant_peers` or `quarantine_peers` yet.
3. Peer can authenticate to `wg0` (if they have the config) but `wg0-in` drops everything.
4. Admin (or automation) can choose to initially add the IP to `quarantine_peers`:

   ```bash
   sudo /usr/local/sbin/zbox-quarantine.sh 10.10.5.2
   ```

   Now the peer can:

   * Reach Admin Portal on `http://10.10.0.1:3000` (over the VPN)
   * Reach Math Wiz / onboarding service on `http://10.10.0.1:4000`
   * Resolve DNS

### 5.2 Client posture submission

On the client machine:

1. Clone `client_posture/` from the repo.

2. Create a Python virtualenv and install dependencies.

3. Run the CLI with your server URL and peer ID:

   ```bash
   python posture_client.py \
     --server http://10.10.0.1:3000 \
     --peer-ip 10.10.5.2 \
     --hostname my-laptop \
     # plus any other flags your script exposes
   ```

4. Script collects posture such as:

   * OS / version
   * Basic security state (firewall, AV, updates, etc.)
   * Possibly hardware or environment checks, depending on your implementation

5. Script sends a JSON payload to the Admin Portal’s posture endpoint.

### 5.3 Admin review and allow/quarantine

In the Admin Portal (running on the Z-Box host):

1. Admin reviews the posture for each peer (e.g., from a table view).

2. Admin clicks “Allow” or “Quarantine”:

   * **Allow**:

     * Server runs `/usr/local/sbin/zbox-allow.sh <peer-ip>`
     * This updates `nftables`:

       * Adds IP to `compliant_peers`
       * Removes IP from `quarantine_peers` if present

   * **Quarantine**:

     * Server runs `/usr/local/sbin/zbox-quarantine.sh <peer-ip>`
     * Adds IP to `quarantine_peers` and removes it from `compliant_peers`.

3. Changes are immediate; no WireGuard restart needed.

End result:

* Only peers with an acceptable posture (as judged by the admin) land in `compliant_peers`.
* Others stay in quarantine (onboarding only) or completely blocked.

---

## 6. Monitoring and dashboards

### 6.1 Prometheus

Prometheus is configured with:

* Scrape itself
* Scrape `node_exporter` on the host (`:9100`)
* Scrape `zbox-admin` on its metrics endpoint (if exposed)
* Scrape `wg_exporter` for WireGuard metrics

Config lives in `monitoring/prometheus.yml` and is mounted into the container.

### 6.2 WireGuard exporter

`wg_exporter`:

* Runs with `network_mode: host`
* Reads `/etc/wireguard` (mounted read-only)
* Exposes metrics such as:

  * Handshake age per peer
  * Bytes sent/received
  * Peer presence

Prometheus pulls from the exporter, and Grafana visualizes:

* Online/offline peers
* Handshake freshness
* Traffic per peer
* Alerts (if you configure them)

### 6.3 Grafana

Grafana:

* Exposed on `:3001` (host mapped to `3000` in container)
* Uses Prometheus as a data source
* You can import a `Z-Box` dashboard to show:

  * WireGuard health
  * Z-Box host metrics (CPU, RAM, FS, network)
  * Admin Portal responses / error rates
  * Peers online vs offline

---

## 7. Math Wiz SSO app

The **Math Wiz** app is a Next.js (App Router) single-page experience for your calculator suite.

Key points:

* Protected via `next-auth` + `KeycloakProvider`:

  * `issuer = http://10.10.0.1:8080/realms/zbox`
  * `clientId = calc-app`
  * Uses JWT session strategy, stores access token in JWT, attaches to `session`.

* App layout:

  * Root layout wraps everything in a `SessionProvider` (and your Redux `Provider`).
  * `app/page.tsx` reads `useSession()` to show:

    * Sign in / sign out buttons
    * Gate access to calculators; no session → app blocked message.

* Exposed only on the Z-Box internal network (WireGuard side), not LAN/WAN:

  * Coupled with nftables, only peers in `compliant_peers` can realistically reach it.

This demonstrates how **any internal app** (not just Math Wiz) can trust Keycloak and Z-Box for:

* Authentication (Keycloak)
* Network-level authorization (nftables sets)

---

## 8. Development / contribution notes

* For host bootstrap and full step-by-step setup, follow the dedicated bootstrap README/scripts you generated for:

  * WireGuard provisioning
  * Docker installation
  * `nftables` configuration
  * Git clone + `docker compose up -d`

* For backend (Admin Portal):

  * Work inside `admin/`
  * Standard Node/TypeScript workflow (`npm install`, `npm run dev`, `npm run build`)

* For posture client:

  * Work inside `client_posture/`
  * Use virtualenv + `pip install -r requirements.txt`
  * Run `python posture_client.py --help` to see the full CLI API

* For Math Wiz:

  * Work inside `mathwiz/`
  * Standard Next.js dev workflow (`npm install`, `npm run dev`)
  * Remember to point `NEXTAUTH_URL` and Keycloak issuer/client ID correctly.

---

## 9. Status and limitations

* Prototype / lab-grade:

  * **No** HA
  * **No** automatic posture enforcement (manual admin review by design)
  * **No** production hardening of Keycloak, Grafana, etc.
* Designed for:

  * Small team / uni / club setups
  * Demonstrating a simple posture-aware VPN gateway using only one Linux VM and familiar tools.

Use this README as the high-level entry point; the bootstrap instructions and per-directory READMEs cover exact commands and flags.

```
```
