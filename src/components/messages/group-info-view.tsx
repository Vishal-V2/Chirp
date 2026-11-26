"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  LogOut,
  MoreHorizontal,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import { PageHeader } from "@/components/layout/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useViewer } from "@/components/providers/viewer-provider";
import {
  AddGroupMembersMutation,
  GroupInfoQuery,
  LeaveGroupMutation,
  RemoveGroupMemberMutation,
  SetGroupAdminMutation,
  UpdateGroupMutation,
} from "@/graphql/client/messages";
import { IMAGE_TYPES } from "@/lib/storage";
import { checkImage, uploadMessageImage } from "@/lib/upload";
import { ChatAvatar, chatTitle } from "./chat-identity";
import { PeoplePicker, type PickedPerson } from "./people-picker";

/** Groups hold up to 20 people (matches the server). */
const MAX_GROUP = 20;

const errorText = (
  r: { error?: { graphQLErrors: { message: string }[] } },
  fallback: string,
) => r.error?.graphQLErrors[0]?.message ?? fallback;

/** A group's members, name and photo; admins can manage them. */
export function GroupInfoView({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const viewer = useViewer()!;
  const [{ data, error }] = useQuery({
    query: GroupInfoQuery,
    variables: { id: conversationId },
  });
  const [, update] = useMutation(UpdateGroupMutation);
  const [, addMembers] = useMutation(AddGroupMembersMutation);
  const [, removeMember] = useMutation(RemoveGroupMemberMutation);
  const [, setAdmin] = useMutation(SetGroupAdminMutation);
  const [{ fetching: leaving }, leave] = useMutation(LeaveGroupMutation);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<PickedPerson[]>([]);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [uploading, setUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const group = data?.conversation;
  if (!group || !group.isGroup) {
    return (
      <>
        <PageHeader back title="Group info" />
        <p className="px-4 py-10 text-center text-muted-foreground">
          {error || (data && !group?.isGroup)
            ? "This group doesn't exist, or you're not in it."
            : "Loading…"}
        </p>
      </>
    );
  }

  const isAdmin = group.myRole === "ADMIN";
  const isCreator = group.createdById === viewer.id;
  const members = group.participants;
  const title = chatTitle(group, viewer.id);

  async function saveName() {
    if (editingName === null) return;
    const r = await update({ conversationId, name: editingName.trim() });
    if (r.error) return void toast.error(errorText(r, "Couldn't rename it."));
    setEditingName(null);
  }

  async function changePhoto(file: File) {
    const problem = checkImage(file);
    if (problem) return void toast.error(problem);
    setUploading(true);
    try {
      const photoPath = await uploadMessageImage(
        conversationId,
        viewer.id,
        file,
      );
      const r = await update({ conversationId, photoPath });
      if (r.error) toast.error(errorText(r, "Couldn't change the photo."));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't upload the photo.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <PageHeader
        back
        title="Group info"
        subtitle={`${members.length} members`}
      />

      <section className="flex flex-col items-center px-4 pt-6 pb-4 text-center">
        <div className="relative">
          <ChatAvatar chat={group} viewerId={viewer.id} className="size-24" />
          {isAdmin && (
            <>
              <input
                ref={photoInput}
                type="file"
                accept={IMAGE_TYPES.join(",")}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void changePhoto(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                aria-label="Change group photo"
                disabled={uploading}
                onClick={() => photoInput.current?.click()}
                className="pressable absolute -right-1 -bottom-1 rounded-full border bg-background p-2 hover:bg-muted disabled:opacity-60"
              >
                <Camera className="size-4" />
              </button>
            </>
          )}
        </div>
        {group.photoPath && isAdmin && (
          <button
            type="button"
            onClick={() => void update({ conversationId, photoPath: "" })}
            className="mt-2 text-[13px] text-muted-foreground hover:underline"
          >
            Remove photo
          </button>
        )}

        {editingName !== null ? (
          <form
            className="mt-3 flex w-full max-w-sm gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveName();
            }}
          >
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              maxLength={50}
              placeholder="Group name"
              aria-label="Group name"
              className="h-10 flex-1 rounded-md border bg-transparent px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="pressable h-10 rounded-full bg-foreground px-4 text-sm font-bold text-background"
            >
              Save
            </button>
          </form>
        ) : (
          <h2 className="mt-3 font-heading text-2xl font-extrabold tracking-tight">
            {title}
          </h2>
        )}
        {isAdmin && editingName === null && (
          <button
            type="button"
            onClick={() => setEditingName(group.name ?? "")}
            className="mt-1 text-sm text-primary hover:underline"
          >
            {group.name ? "Rename group" : "Name this group"}
          </button>
        )}
      </section>

      <h3 className="px-4 pt-2 pb-1 font-heading text-xl font-bold tracking-tight">
        Members
      </h3>
      {isAdmin && members.length < MAX_GROUP && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-primary transition-colors hover:bg-muted/50"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="size-5" />
          </span>
          <span className="font-semibold">Add people</span>
        </button>
      )}
      <ul>
        {members.map((p) => {
          const u = p.user;
          const me = u.id === viewer.id;
          const creator = u.id === group.createdById;
          const canRemove =
            isAdmin && !me && !creator && (p.role !== "ADMIN" || isCreator);
          const canPromote = isAdmin && !me && p.role !== "ADMIN";
          const canDemote = isCreator && !me && p.role === "ADMIN";
          return (
            <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Link href={`/${u.username}`} className="shrink-0">
                <UserAvatar
                  name={u.displayName}
                  username={u.username}
                  src={u.avatarUrl ?? undefined}
                />
              </Link>
              <Link
                href={`/${u.username}`}
                className="min-w-0 flex-1 leading-tight"
              >
                <span className="block truncate font-bold hover:underline">
                  {u.displayName}
                  {me && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (you)
                    </span>
                  )}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  @{u.username}
                </span>
              </Link>
              {(creator || p.role === "ADMIN") && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {creator ? "Creator" : "Admin"}
                </span>
              )}
              {(canRemove || canPromote || canDemote) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label={`Options for ${u.displayName}`}
                    className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="size-5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {canPromote && (
                      <DropdownMenuItem
                        className="py-2 text-[15px]"
                        onClick={async () => {
                          const r = await setAdmin({
                            conversationId,
                            userId: u.id,
                            admin: true,
                          });
                          if (r.error)
                            toast.error(errorText(r, "Couldn't do that."));
                        }}
                      >
                        <Shield /> Make admin
                      </DropdownMenuItem>
                    )}
                    {canDemote && (
                      <DropdownMenuItem
                        className="py-2 text-[15px]"
                        onClick={async () => {
                          const r = await setAdmin({
                            conversationId,
                            userId: u.id,
                            admin: false,
                          });
                          if (r.error)
                            toast.error(errorText(r, "Couldn't do that."));
                        }}
                      >
                        <ShieldOff /> Remove as admin
                      </DropdownMenuItem>
                    )}
                    {canRemove && (
                      <DropdownMenuItem
                        variant="destructive"
                        className="py-2 text-[15px]"
                        onClick={async () => {
                          const r = await removeMember({
                            conversationId,
                            userId: u.id,
                          });
                          if (r.error)
                            toast.error(errorText(r, "Couldn't remove them."));
                        }}
                      >
                        <UserMinus /> Remove from group
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => setConfirmLeave(true)}
        className="mt-4 flex w-full items-center gap-3 px-4 py-3 text-left font-semibold text-destructive transition-colors hover:bg-destructive/10"
      >
        <LogOut className="size-5" /> Leave group
      </button>

      {/* Add people */}
      <Dialog
        open={adding}
        onOpenChange={(o) => {
          setAdding(o);
          if (!o) setPicked([]);
        }}
      >
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md sm:rounded-2xl">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div>
              <DialogTitle className="font-heading text-xl font-bold tracking-tight">
                Add people
              </DialogTitle>
              <DialogDescription className="text-[13px]">
                {MAX_GROUP - members.length} more can join.
              </DialogDescription>
            </div>
            <button
              type="button"
              disabled={picked.length === 0}
              onClick={async () => {
                const r = await addMembers({
                  conversationId,
                  userIds: picked.map((p) => p.id),
                });
                if (r.error)
                  return void toast.error(errorText(r, "Couldn't add them."));
                setAdding(false);
                setPicked([]);
              }}
              className="pressable h-9 rounded-full bg-foreground px-4 text-sm font-bold text-background disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <PeoplePicker
            picked={picked}
            onChange={setPicked}
            max={MAX_GROUP - members.length}
            exclude={members.map((p) => p.user.id)}
          />
        </DialogContent>
      </Dialog>

      {/* Leave */}
      <Dialog
        open={confirmLeave}
        onOpenChange={(o) => !leaving && setConfirmLeave(o)}
      >
        <DialogContent
          showCloseButton={false}
          className="gap-0 p-8 sm:max-w-80 sm:rounded-2xl"
        >
          <DialogTitle className="font-heading text-xl font-bold tracking-tight">
            Leave {title}?
          </DialogTitle>
          <DialogDescription className="mt-2 text-[15px]">
            You won&apos;t get its messages any more, and someone would need to
            add you back.
          </DialogDescription>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              disabled={leaving}
              onClick={async () => {
                const r = await leave({ conversationId });
                if (r.error)
                  return void toast.error(errorText(r, "Couldn't leave."));
                toast.success("You left the group");
                router.push("/messages");
              }}
              className="pressable h-11 rounded-full bg-destructive font-bold text-white hover:bg-destructive/90 disabled:opacity-60"
            >
              {leaving ? "Leaving…" : "Leave"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmLeave(false)}
              className="pressable h-11 rounded-full border font-bold hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
