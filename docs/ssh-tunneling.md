# SSH Tunneling — Database Access

Connect to the production PostgreSQL database from your local machine.
Postgres is bound to `127.0.0.1:5432` on the VPS (not publicly exposed), so an SSH tunnel is required.

## Open tunnel

```bash
ssh -L 5432:localhost:5432 deploy@167.233.130.104 -N
```

Keep this terminal tab open while using the database. The `-N` flag holds the tunnel without opening a shell.

## Stop tunnel

```bash
pkill -f "ssh -L 5432:localhost:5432 deploy@167.233.130.104"
```

## Connect in DBGate (or any Postgres client)

| Field    | Value       |
|----------|-------------|
| Server   | `localhost` |
| Port     | `5432`      |
| User     | from VPS `~/apps/test-creator/.env` → `DB_USERNAME` |
| Password | from VPS `~/apps/test-creator/.env` → `DB_PASSWORD` |
| Database | from VPS `~/apps/test-creator/.env` → `DB_NAME`     |

To view credentials on the VPS:

```bash
ssh deploy@167.233.130.104 "cat ~/apps/test-creator/.env"
```

## Troubleshooting

**`ENOTFOUND 167-233-130-104`** — wrong hostname format. Use the IP with dots (`167.233.130.104`), not the sslip.io dash format.

**`Permission denied (publickey)`** — your local SSH key isn't authorized on the VPS. Add it:

```bash
ssh-copy-id deploy@167.233.130.104
```

**`Address already in use :5432`** — a previous tunnel is still running. Stop it first:

```bash
pkill -f "ssh -L 5432:localhost:5432"
```
