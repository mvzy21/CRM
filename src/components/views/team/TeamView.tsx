import { MoreVertical, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { Input } from "#/components/ui/input.tsx";
import { PersonAvatar } from "#/components/ui/person-avatar.tsx";
import { APP_ROLES, ROLE_LABELS } from "#/lib/supabase/roles.ts";
import {
  createTeam,
  deleteUser,
  listTeams,
  listUsers,
  type ManagedUser,
  resendInvite,
  setUserActive,
  type Team,
  updateUser,
} from "#/lib/supabase/users.ts";
import { formatRelativeTime } from "#/lib/utils.ts";
import { InviteUserDialog } from "./InviteUserDialog.tsx";

interface TeamViewProps {
  currentUserId: string;
}

export function TeamView({ currentUserId }: TeamViewProps) {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    const [usersResult, teamsResult] = await Promise.all([
      listUsers(),
      listTeams(),
    ]);

    if (usersResult.success) {
      setUsers(usersResult.users);
      setError(null);
    } else {
      setError(usersResult.message);
    }

    if (teamsResult.success) setTeams(teamsResult.teams);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
  useEffect(() => {
    refresh();
  }, []);

  async function handleChangeRole(
    user: ManagedUser,
    role: (typeof APP_ROLES)[number],
  ) {
    if (role === user.role) return;
    setPendingUserId(user.id);
    const result = await updateUser({
      data: { userId: user.id, role, teamId: user.teamId },
    });
    setPendingUserId(null);
    if (result.success) refresh();
    else setError(result.message);
  }

  async function handleChangeTeam(user: ManagedUser, teamId: string | null) {
    if (teamId === user.teamId) return;
    setPendingUserId(user.id);
    const result = await updateUser({
      data: { userId: user.id, role: user.role, teamId },
    });
    setPendingUserId(null);
    if (result.success) refresh();
    else setError(result.message);
  }

  async function handleToggleActive(user: ManagedUser) {
    setPendingUserId(user.id);
    const result = await setUserActive({
      data: { userId: user.id, isActive: !user.isActive },
    });
    setPendingUserId(null);
    if (result.success) refresh();
    else setError(result.message);
  }

  async function handleResendInvite(user: ManagedUser) {
    setPendingUserId(user.id);
    const result = await resendInvite({ data: { userId: user.id } });
    setPendingUserId(null);
    if (!result.success) setError(result.message);
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteUser({ data: { userId: deleteTarget.id } });
    setDeleting(false);
    if (result.success) {
      setDeleteTarget(null);
      refresh();
    } else {
      setError(result.message);
      setDeleteTarget(null);
    }
  }

  async function handleCreateTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const result = await createTeam({ data: { name: newTeamName.trim() } });
    setCreatingTeam(false);
    if (result.success) {
      setNewTeamName("");
      refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Team &amp; access
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
            Provision accounts, assign roles, and control who has access.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" />
          Invite user
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]"
        >
          {error}
        </p>
      ) : null}

      <div className="panel mt-8 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Teams</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {teams.length === 0 ? (
            <span className="text-sm text-[var(--ink-soft)]">
              No teams yet.
            </span>
          ) : (
            teams.map((team) => (
              <span
                key={team.id}
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-medium text-[var(--ink)]"
              >
                {team.name}
              </span>
            ))
          )}
        </div>
        <form
          onSubmit={handleCreateTeam}
          className="mt-4 flex max-w-sm items-center gap-2"
        >
          <Input
            placeholder="New team name"
            value={newTeamName}
            onChange={(event) => setNewTeamName(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={creatingTeam || !newTeamName.trim()}
          >
            Add
          </Button>
        </form>
      </div>

      <div className="panel mt-6 overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-xs text-[var(--ink-soft)]">
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Team</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users === null ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  Loading users&hellip;
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-6 text-center text-[var(--ink-soft)]"
                >
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--line)] last:border-0"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <PersonAvatar
                        name={user.displayName}
                        email={user.email}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 truncate font-medium text-[var(--ink)]">
                          {user.displayName ?? user.email}
                          {user.id === currentUserId ? (
                            <span className="text-xs font-normal text-[var(--ink-soft)]">
                              (you)
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-[var(--ink-soft)]">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink)]">
                    {ROLE_LABELS[user.role]}
                  </td>
                  <td className="px-5 py-3 text-[var(--ink)]">
                    {user.teamName ?? (
                      <span className="text-[var(--ink-soft)]">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        user.isActive
                          ? "rounded-full bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-medium text-[var(--kicker)]"
                          : "rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)]"
                      }
                    >
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-soft)]">
                    {formatRelativeTime(user.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={pendingUserId === user.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">
                            Actions for {user.displayName ?? user.email}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Change role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {APP_ROLES.map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={role === user.role}
                                onSelect={() => handleChangeRole(user, role)}
                              >
                                {ROLE_LABELS[role]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            Change team
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem
                              disabled={user.teamId === null}
                              onSelect={() => handleChangeTeam(user, null)}
                            >
                              No team
                            </DropdownMenuItem>
                            {teams.map((team) => (
                              <DropdownMenuItem
                                key={team.id}
                                disabled={team.id === user.teamId}
                                onSelect={() => handleChangeTeam(user, team.id)}
                              >
                                {team.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          disabled={user.id === currentUserId}
                          onSelect={() => handleResendInvite(user)}
                        >
                          Resend invite
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          variant={user.isActive ? "destructive" : "default"}
                          disabled={user.id === currentUserId}
                          onSelect={() => handleToggleActive(user)}
                        >
                          {user.isActive ? "Deactivate" : "Reactivate"}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          variant="destructive"
                          disabled={user.id === currentUserId}
                          onSelect={() => setDeleteTarget(user)}
                        >
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        teams={teams}
        onInvited={refresh}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently deletes{" "}
              <strong>{deleteTarget?.displayName ?? deleteTarget?.email}</strong>
              's account and access. This can't be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDeleteConfirmed}
            >
              {deleting ? "Deleting..." : "Delete user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
