import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { UserDetailPageContent } from "@/components/admin/user-detail-page-content";
import { AddUserModal } from "@/components/admin/add-user-modal";
import { UserDetailsSkeleton } from "@/components/skeletons";
import {
  fetchAdminUserById,
  getAdminUsersErrorMessage,
  type AdminUserDetail,
} from "@/services/admin-users-api";
import { Button } from "@/components/ui/button";

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);

  async function loadUser() {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetchAdminUserById(userId);
      setUser(response.data.user);
    } catch (error) {
      toast.error(
        getAdminUsersErrorMessage(error, "Failed to load user details.")
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!userId) return;
      setIsLoading(true);
      try {
        const response = await fetchAdminUserById(userId);
        if (!cancelled) setUser(response.data.user);
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getAdminUsersErrorMessage(error, "Failed to load user details.")
          );
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!isLoading && !user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
        <p className="text-sm text-muted-foreground">User not found.</p>
        <Button render={<Link to="/users" />}>Back to Users</Button>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <UserDetailPageContent
          user={user}
          isLoading={isLoading}
          onEdit={() => setIsEditOpen(true)}
          onUserUpdated={(updated) => setUser(updated)}
        />
      ) : (
        <UserDetailsSkeleton />
      )}

      <AddUserModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        isEditMode
        selectedUser={user}
        onCreated={async () => {
          setIsEditOpen(false);
          await loadUser();
        }}
      />
    </>
  );
}
