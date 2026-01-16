"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import responsive from "@/app/responsive.module.css";

interface Neighborhood {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  memberCount: number;
  itemCount: number;
}

interface UserMembership {
  id: string;
  neighborhood_id: string;
  status: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  membershipCount: number;
  primaryNeighborhood: string | null;
  memberships: UserMembership[];
}

interface AdminClientProps {
  neighborhoods: Neighborhood[];
  users: User[];
  stats: {
    neighborhoodCount: number;
    userCount: number;
    totalItems: number;
  };
}

type Tab = "overview" | "neighborhoods" | "users";

export function AdminClient({ neighborhoods, users, stats }: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    neighborhood: Neighborhood;
    confirmName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removeModal, setRemoveModal] = useState<{
    user: User;
    membership: UserMembership;
    neighborhoodName: string;
  } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [addToNeighborhoodModal, setAddToNeighborhoodModal] = useState<{
    user: User;
    selectedNeighborhoodId: string;
  } | null>(null);
  const [isAddingMembership, setIsAddingMembership] = useState(false);
  const [editSlugModal, setEditSlugModal] = useState<{
    neighborhood: Neighborhood;
    newSlug: string;
  } | null>(null);
  const [isUpdatingSlug, setIsUpdatingSlug] = useState(false);

  // Get neighborhood name by ID
  const getNeighborhoodName = (id: string) => {
    return neighborhoods.find((n) => n.id === id)?.name || "Unknown";
  };

  // Filter users based on search (name, email, or neighborhood name)
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const search = userSearch.toLowerCase();
    return users.filter((u) => {
      // Check name and email
      if (u.name?.toLowerCase().includes(search)) return true;
      if (u.email.toLowerCase().includes(search)) return true;
      // Check neighborhood names
      const userNeighborhoodNames = u.memberships.map((m) =>
        getNeighborhoodName(m.neighborhood_id).toLowerCase()
      );
      return userNeighborhoodNames.some((name) => name.includes(search));
    });
  }, [users, userSearch, neighborhoods]);

  // Handle neighborhood deletion
  const handleDeleteNeighborhood = async () => {
    if (!deleteModal) return;
    if (deleteModal.confirmName !== deleteModal.neighborhood.name) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/neighborhoods/${deleteModal.neighborhood.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete neighborhood");
        return;
      }

      setDeleteModal(null);
      router.refresh();
    } catch (error) {
      alert("Failed to delete neighborhood");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle membership removal
  const handleRemoveMembership = async () => {
    if (!removeModal) return;

    setIsRemoving(true);
    try {
      const response = await fetch(
        `/api/admin/users/${removeModal.user.id}/memberships/${removeModal.membership.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to remove membership");
        return;
      }

      setRemoveModal(null);
      router.refresh();
    } catch (error) {
      alert("Failed to remove membership");
    } finally {
      setIsRemoving(false);
    }
  };

  // Handle adding user to neighborhood
  const handleAddToNeighborhood = async () => {
    if (!addToNeighborhoodModal || !addToNeighborhoodModal.selectedNeighborhoodId) return;

    setIsAddingMembership(true);
    try {
      const response = await fetch(
        `/api/admin/users/${addToNeighborhoodModal.user.id}/memberships`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            neighborhood_id: addToNeighborhoodModal.selectedNeighborhoodId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to add user to neighborhood");
        return;
      }

      setAddToNeighborhoodModal(null);
      router.refresh();
    } catch (error) {
      alert("Failed to add user to neighborhood");
    } finally {
      setIsAddingMembership(false);
    }
  };

  // Handle slug update
  const handleUpdateSlug = async () => {
    if (!editSlugModal || !editSlugModal.newSlug.trim()) return;

    setIsUpdatingSlug(true);
    try {
      const response = await fetch(
        `/api/admin/neighborhoods/${editSlugModal.neighborhood.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: editSlugModal.newSlug.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to update slug");
        return;
      }

      setEditSlugModal(null);
      router.refresh();
    } catch (error) {
      alert("Failed to update slug");
    } finally {
      setIsUpdatingSlug(false);
    }
  };

  // Get neighborhoods the user is NOT a member of
  const getAvailableNeighborhoods = (user: User) => {
    const memberNeighborhoodIds = user.memberships.map((m) => m.neighborhood_id);
    return neighborhoods.filter((n) => !memberNeighborhoodIds.includes(n.id));
  };

  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Staff Admin</h1>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "overview" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === "neighborhoods" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("neighborhoods")}
        >
          Neighborhoods
        </button>
        <button
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className={styles.tabContent}>
          <div className={responsive.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.neighborhoodCount}</span>
              <span className={styles.statLabel}>Neighborhoods</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.userCount}</span>
              <span className={styles.statLabel}>Users</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{stats.totalItems}</span>
              <span className={styles.statLabel}>Total Items</span>
            </div>
          </div>

          <div className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={responsive.grid2}>
              <Link href="/neighborhoods/new" className={styles.actionCard}>
                <span className={styles.actionIcon}>+</span>
                <span>New Neighborhood</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Neighborhoods Tab */}
      {activeTab === "neighborhoods" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>All Neighborhoods</h2>
            <Link href="/neighborhoods/new" className={styles.primaryButton}>
              New Neighborhood
            </Link>
          </div>

          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.colName}>Name</span>
              <span className={styles.colSlug}>Slug</span>
              <span className={styles.colCount}>Members</span>
              <span className={styles.colCount}>Items</span>
              <span className={styles.colDate}>Created</span>
              <span className={styles.colActions}>Actions</span>
            </div>
            {neighborhoods.map((n) => (
              <div key={n.id} className={styles.tableRow}>
                <span className={styles.colName}>{n.name}</span>
                <span className={styles.colSlug}>
                  {n.slug}
                  <button
                    className={styles.editSlugButton}
                    onClick={() => setEditSlugModal({ neighborhood: n, newSlug: n.slug })}
                    title="Edit slug"
                  >
                    Edit
                  </button>
                </span>
                <span className={styles.colCount}>{n.memberCount}</span>
                <span className={styles.colCount}>{n.itemCount}</span>
                <span className={styles.colDate}>
                  {new Date(n.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className={styles.colActions}>
                  <Link
                    href={`/neighborhoods/${n.slug}/settings`}
                    className={styles.actionLink}
                  >
                    Settings
                  </Link>
                  <button
                    className={styles.deleteButton}
                    onClick={() => setDeleteModal({ neighborhood: n, confirmName: "" })}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))}
            {neighborhoods.length === 0 && (
              <div className={styles.emptyRow}>No neighborhoods yet</div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>All Users ({users.length})</h2>
            <input
              type="search"
              placeholder="Search by name, email, or neighborhood..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.userList}>
            {filteredUsers.map((u) => (
              <div key={u.id} className={styles.userCard}>
                <div
                  className={styles.userRow}
                  onClick={() =>
                    setExpandedUserId(expandedUserId === u.id ? null : u.id)
                  }
                >
                  <div className={styles.userInfo}>
                    {u.avatar_url ? (
                      <Image
                        src={u.avatar_url}
                        alt={u.name || "User"}
                        width={40}
                        height={40}
                        className={styles.avatar}
                      />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {getInitial(u.name)}
                      </div>
                    )}
                    <div className={styles.userDetails}>
                      <span className={styles.userName}>{u.name || "No name"}</span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                  </div>
                  <div className={styles.userMeta}>
                    <span className={styles.membershipBadge}>
                      {u.membershipCount} neighborhood{u.membershipCount !== 1 ? "s" : ""}
                    </span>
                    {u.primaryNeighborhood && (
                      <span className={styles.primaryBadge}>{u.primaryNeighborhood}</span>
                    )}
                    <span className={styles.expandIcon}>
                      {expandedUserId === u.id ? "−" : "+"}
                    </span>
                  </div>
                </div>

                {expandedUserId === u.id && (
                  <div className={styles.userExpanded}>
                    <div className={styles.expandedHeader}>
                      <h4 className={styles.expandedTitle}>Memberships</h4>
                      {getAvailableNeighborhoods(u).length > 0 && (
                        <button
                          className={styles.addToNeighborhoodButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddToNeighborhoodModal({
                              user: u,
                              selectedNeighborhoodId: "",
                            });
                          }}
                        >
                          + Add to Neighborhood
                        </button>
                      )}
                    </div>
                    {u.memberships.length > 0 ? (
                      <div className={styles.membershipList}>
                        {u.memberships.map((m) => (
                          <div key={m.id} className={styles.membershipRow}>
                            <span className={styles.membershipName}>
                              {getNeighborhoodName(m.neighborhood_id)}
                            </span>
                            <span
                              className={`${styles.statusBadge} ${
                                m.status === "active"
                                  ? styles.statusActive
                                  : styles.statusPending
                              }`}
                            >
                              {m.status}
                            </span>
                            {m.status === "active" && (
                              <button
                                className={styles.removeButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRemoveModal({
                                    user: u,
                                    membership: m,
                                    neighborhoodName: getNeighborhoodName(m.neighborhood_id),
                                  });
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.noMemberships}>No memberships</p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className={styles.emptyRow}>
                {userSearch ? "No users match your search" : "No users yet"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Neighborhood Modal */}
      {deleteModal && (
        <div className={styles.modalOverlay} onClick={() => setDeleteModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Delete Neighborhood</h3>
            <p className={styles.modalText}>
              This will permanently delete <strong>{deleteModal.neighborhood.name}</strong> and
              all associated data including:
            </p>
            <ul className={styles.modalList}>
              <li>{deleteModal.neighborhood.memberCount} memberships</li>
              <li>{deleteModal.neighborhood.itemCount} items</li>
              <li>All posts, loans, and other data</li>
            </ul>
            <p className={styles.modalWarning}>
              This action cannot be undone. Type the neighborhood name to confirm:
            </p>
            <input
              type="text"
              placeholder={deleteModal.neighborhood.name}
              value={deleteModal.confirmName}
              onChange={(e) =>
                setDeleteModal({ ...deleteModal, confirmName: e.target.value })
              }
              className={styles.confirmInput}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeleteNeighborhood}
                disabled={
                  deleteModal.confirmName !== deleteModal.neighborhood.name ||
                  isDeleting
                }
              >
                {isDeleting ? "Deleting..." : "Delete Neighborhood"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Membership Modal */}
      {removeModal && (
        <div className={styles.modalOverlay} onClick={() => setRemoveModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Remove from Neighborhood</h3>
            <p className={styles.modalText}>
              Remove <strong>{removeModal.user.name || removeModal.user.email}</strong> from{" "}
              <strong>{removeModal.neighborhoodName}</strong>?
            </p>
            <p className={styles.modalWarning}>
              This will remove their membership immediately. They can request to rejoin later.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setRemoveModal(null)}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleRemoveMembership}
                disabled={isRemoving}
              >
                {isRemoving ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Neighborhood Modal */}
      {addToNeighborhoodModal && (
        <div className={styles.modalOverlay} onClick={() => setAddToNeighborhoodModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Add to Neighborhood</h3>
            <p className={styles.modalText}>
              Add <strong>{addToNeighborhoodModal.user.name || addToNeighborhoodModal.user.email}</strong> to a neighborhood:
            </p>
            <select
              className={styles.selectInput}
              value={addToNeighborhoodModal.selectedNeighborhoodId}
              onChange={(e) =>
                setAddToNeighborhoodModal({
                  ...addToNeighborhoodModal,
                  selectedNeighborhoodId: e.target.value,
                })
              }
            >
              <option value="">Select a neighborhood...</option>
              {getAvailableNeighborhoods(addToNeighborhoodModal.user).map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setAddToNeighborhoodModal(null)}
                disabled={isAddingMembership}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleAddToNeighborhood}
                disabled={!addToNeighborhoodModal.selectedNeighborhoodId || isAddingMembership}
              >
                {isAddingMembership ? "Adding..." : "Add to Neighborhood"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Slug Modal */}
      {editSlugModal && (
        <div className={styles.modalOverlay} onClick={() => setEditSlugModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Edit Neighborhood Slug</h3>
            <p className={styles.modalText}>
              Change the URL slug for <strong>{editSlugModal.neighborhood.name}</strong>:
            </p>
            <div className={styles.slugInputWrapper}>
              <span className={styles.slugPrefix}>/neighborhoods/</span>
              <input
                type="text"
                value={editSlugModal.newSlug}
                onChange={(e) =>
                  setEditSlugModal({
                    ...editSlugModal,
                    newSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                className={styles.slugInput}
                placeholder="neighborhood-slug"
              />
            </div>
            <p className={styles.modalHint}>
              Only lowercase letters, numbers, and hyphens are allowed.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setEditSlugModal(null)}
                disabled={isUpdatingSlug}
              >
                Cancel
              </button>
              <button
                className={styles.primaryButton}
                onClick={handleUpdateSlug}
                disabled={
                  !editSlugModal.newSlug.trim() ||
                  editSlugModal.newSlug === editSlugModal.neighborhood.slug ||
                  isUpdatingSlug
                }
              >
                {isUpdatingSlug ? "Updating..." : "Update Slug"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
