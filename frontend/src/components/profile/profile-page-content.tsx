import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { isPendingPasswordUser } from "@/lib/rbac";
import { PageShell } from "@/components/layout/page-shell";
import { ProfileSkeleton } from "@/components/skeletons";
import {
  changeUserPassword,
  getProfilePictureUrl,
  getUsersErrorMessage,
  updateUserProfile,
} from "@/services/users-api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

const MAX_PROFILE_PICTURE_SIZE = 150 * 1024;
const PHONE_PREFIX = "+91 ";
const READ_ONLY_INPUT = "bg-white/25 text-muted-foreground backdrop-blur-sm dark:bg-white/5";

type ProfileFormData = {
  firstName: string;
  lastName: string;
  employeeId: string;
  joiningDate: string;
  department: string;
  designation: string;
  role: string;
  officialEmail: string;
  personalEmail: string;
  mobileNumber: string;
  emergencyContact: string;
  dob: string;
  gender: string;
  address: string;
  ctc: string;
  bankAccount: string;
  ifsc: string;
  panNumber: string;
  aadhaarNumber: string;
  allocatedAssets: string;
};

function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPhoneInput(value: string): string {
  if (!value.trim()) {
    return PHONE_PREFIX;
  }

  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("91")) {
    digits = digits.substring(2);
  }
  digits = digits.slice(0, 10);

  let formattedNumber = PHONE_PREFIX;
  if (digits.length > 0) {
    formattedNumber += digits.slice(0, 5);
  }
  if (digits.length > 5) {
    formattedNumber += " " + digits.slice(5);
  }

  return formattedNumber;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function emptyForm(): ProfileFormData {
  return {
    firstName: "",
    lastName: "",
    employeeId: "",
    joiningDate: "",
    department: "",
    designation: "",
    role: "",
    officialEmail: "",
    personalEmail: "",
    mobileNumber: PHONE_PREFIX,
    emergencyContact: "",
    dob: "",
    gender: "",
    address: "",
    ctc: "",
    bankAccount: "",
    ifsc: "",
    panNumber: "",
    aadhaarNumber: "",
    allocatedAssets: "",
  };
}

export function ProfilePageContent() {
  const { user, roleLabel, updateSessionUser, isLoading: isAuthLoading } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPending = isPendingPasswordUser(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>(emptyForm);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPwd, setShowPwd] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const togglePwd = (field: "current" | "new" | "confirm") => {
    setShowPwd((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (!user) return;

    const nameParts = (user.name ?? "").trim().split(/\s+/);
    setFormData({
      firstName: user.firstName || nameParts[0] || "",
      lastName: user.lastName || nameParts.slice(1).join(" ") || "",
      employeeId: user.employeeId ?? "",
      joiningDate: formatDateForInput(user.joiningDate),
      department: user.departmentName || user.department || "",
      designation: user.designation ?? "",
      role: roleLabel,
      officialEmail: user.officialEmail || user.email || "",
      personalEmail: user.personalEmail ?? "",
      mobileNumber: formatPhoneInput(user.mobileNumber || user.phone || ""),
      emergencyContact: user.emergencyContact ?? "",
      dob: formatDateForInput(user.dob),
      gender: user.gender ?? "",
      address: user.address ?? "",
      ctc:
        user.ctc ||
        (user.salary != null ? String(user.salary) : ""),
      bankAccount: user.bankAccount || "",
      ifsc: user.ifsc || "",
      panNumber: user.panNumber ?? "",
      aadhaarNumber: user.aadhaarNumber ?? "",
      allocatedAssets: user.allocatedAssets || "None",
    });
    setProfileFile(null);
    setPreviewUrl(null);
  }, [user, roleLabel]);

  useEffect(() => {
    if (!profileFile) return;

    const objectUrl = URL.createObjectURL(profileFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profileFile]);

  if (!user) return null;

  // Owner / Administrator: hide HR-only fields (Employee ID, Joining Date, Payroll/Assets)
  const isOwnerOrAdmin =
    user.role === "administrator" ||
    ["Owner", "Admin", "Administrator", "Owner / Administrator", "Administrator / Owner"].includes(
      formData.role || formData.department || ""
    ) ||
    formData.designation === "Owner" ||
    formData.department === "Owner";

  const displayName =
    [formData.firstName, formData.lastName].filter(Boolean).join(" ") ||
    user.name;
  const avatarSrc =
    previewUrl ?? getProfilePictureUrl(user.profilePicture) ?? undefined;

  function updateField<K extends keyof ProfileFormData>(
    field: K,
    value: ProfileFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleMobileChange(e: React.ChangeEvent<HTMLInputElement>) {
    let inputVal = e.target.value;

    if (!inputVal.startsWith("+91")) {
      inputVal = PHONE_PREFIX;
    }

    const rawInput = inputVal.substring(4);
    let digits = rawInput.replace(/\D/g, "");

    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }

    let formattedNumber = PHONE_PREFIX;
    if (digits.length > 0) {
      formattedNumber += digits.slice(0, 5);
    }
    if (digits.length > 5) {
      formattedNumber += " " + digits.slice(5);
    }

    updateField("mobileNumber", formattedNumber);
  }

  function handleProfilePictureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      toast.error("Profile picture must be less than 150KB");
      e.target.value = "";
      return;
    }

    setProfileFile(file);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error("First name is required.");
      return;
    }

    const fullName = [formData.firstName, formData.lastName]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    setIsSavingProfile(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("name", fullName);
      uploadFormData.append("firstName", formData.firstName.trim());
      uploadFormData.append("lastName", formData.lastName.trim());
      uploadFormData.append("personalEmail", formData.personalEmail.trim());
      uploadFormData.append("mobileNumber", formData.mobileNumber.trim());
      uploadFormData.append("phone", formData.mobileNumber.trim());
      uploadFormData.append(
        "emergencyContact",
        formData.emergencyContact.trim()
      );
      uploadFormData.append("gender", formData.gender);
      uploadFormData.append("address", formData.address.trim());
      uploadFormData.append("bankAccount", formData.bankAccount.trim());
      uploadFormData.append("ifsc", formData.ifsc.trim().toUpperCase());
      uploadFormData.append("panNumber", formData.panNumber.trim().toUpperCase());
      uploadFormData.append("aadhaarNumber", formData.aadhaarNumber.trim());

      if (formData.dob) {
        uploadFormData.append("dob", formData.dob);
      }

      if (profileFile) {
        uploadFormData.append("profilePicture", profileFile);
      }

      const response = await updateUserProfile(uploadFormData);
      updateSessionUser(response.data.user);
      setProfileFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(getUsersErrorMessage(error, "Failed to update profile."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error("Please complete all password fields.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const wasPending = isPending;
      const response = await changeUserPassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      if (response.data?.user) {
        updateSessionUser(response.data.user);
      }
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPwd({ current: false, new: false, confirm: false });
      toast.success(response.message || "Password updated successfully.");
      if (wasPending) {
        navigate("/dashboard", { replace: true });
      }
    } catch (error) {
      toast.error(getUsersErrorMessage(error, "Failed to update password."));
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isAuthLoading || !user) {
    return (
      <PageShell
        title="My Profile"
        description="Manage your personal information and security."
      >
        <ProfileSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="My Profile"
      description="Manage your personal information and security."
    >
      {isPending ? (
        <div className="mb-4 rounded-xl border border-amber-400/50 bg-amber-50/60 p-4 text-amber-700 backdrop-blur-sm dark:bg-amber-900/20 dark:text-amber-400">
          <p className="font-bold">Action Required: Update Your Password</p>
          <p className="text-sm">
            You are using a temporary password. You must set a new secure
            password before accessing the CRM.
          </p>
        </div>
      ) : null}

      <Tabs
        key={user.status ?? "unknown"}
        defaultValue={
          isPending ||
          (location.state as { tab?: string } | null)?.tab === "security"
            ? "security"
            : "personal"
        }
        className="mt-6 w-full"
      >
        <TabsList className="mb-6 glass-control h-auto rounded-xl p-1">
          <TabsTrigger value="personal" disabled={isPending}
            className="rounded-lg data-active:bg-white/55 data-active:shadow dark:data-active:bg-white/15">
            Personal Information
          </TabsTrigger>
          <TabsTrigger value="security"
            className="rounded-lg data-active:bg-white/55 data-active:shadow dark:data-active:bg-white/15">
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <div className="glass-card overflow-hidden rounded-2xl">
            <form onSubmit={handleSaveProfile}>
              <div className="flex w-full flex-col md:flex-row">
                <div className="flex w-full flex-col items-center border-r border-white/25 bg-white/20 p-6 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/5 md:w-1/3 lg:w-1/4">
                  <div className="relative">
                    <Avatar className="h-32 w-32">
                      {avatarSrc ? (
                        <AvatarImage
                          src={avatarSrc}
                          alt={displayName || "Profile"}
                        />
                      ) : null}
                      <AvatarFallback className="text-3xl">
                        {getInitials(displayName || user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -right-1 -bottom-1 size-9 rounded-full shadow-sm"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Upload profile picture"
                    >
                      <Camera className="size-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureChange}
                    />
                  </div>

                  <h2 className="mt-4 text-xl font-bold">
                    {displayName || user.name}
                  </h2>
                  <p className="mb-1 text-sm text-muted-foreground">{roleLabel}</p>
                  {formData.designation ? (
                    <p className="mb-6 text-xs text-muted-foreground/70">
                      {formData.designation}
                    </p>
                  ) : (
                    <div className="mb-6" />
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="glass-control w-full border-white/35 hover:bg-white/40 dark:hover:bg-white/15"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    JPG, PNG, or WEBP up to 150KB.
                  </p>
                </div>

                <div className="w-full p-6 md:w-2/3 md:p-8 lg:w-3/4">
                  <div className="space-y-8">
                    <div>
                      <h3 className="mb-4 border-b border-white/30 pb-2 text-lg font-semibold text-foreground dark:border-white/10">
                        Professional Details
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {!isOwnerOrAdmin ? (
                          <>
                            <div className="space-y-2">
                              <Label>Employee ID</Label>
                              <Input
                                value={formData.employeeId || ""}
                                disabled
                                className={READ_ONLY_INPUT}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Joining Date</Label>
                              <Input
                                type="date"
                                value={
                                  formData.joiningDate
                                    ? formData.joiningDate.split("T")[0]
                                    : ""
                                }
                                disabled
                                className={READ_ONLY_INPUT}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Department</Label>
                              <Input
                                value={formData.department || ""}
                                disabled
                                className={READ_ONLY_INPUT}
                              />
                            </div>
                          </>
                        ) : null}
                        <div className="space-y-2">
                          <Label>Designation</Label>
                          <Input
                            value={formData.designation || ""}
                            disabled
                            className={READ_ONLY_INPUT}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input
                            value={formData.role || ""}
                            disabled
                            className={READ_ONLY_INPUT}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-4 border-b border-white/30 pb-2 text-lg font-semibold text-foreground dark:border-white/10">
                        Basic & Contact Info
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-first-name">First Name</Label>
                          <Input
                            id="profile-first-name"
                            value={formData.firstName || ""}
                            onChange={(e) =>
                              updateField("firstName", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-last-name">Last Name</Label>
                          <Input
                            id="profile-last-name"
                            value={formData.lastName || ""}
                            onChange={(e) =>
                              updateField("lastName", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Official Email</Label>
                          <Input
                            value={
                              formData.officialEmail || user.email || ""
                            }
                            disabled
                            className={READ_ONLY_INPUT}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-personal-email">
                            Personal Email
                          </Label>
                          <Input
                            id="profile-personal-email"
                            type="email"
                            value={formData.personalEmail || ""}
                            onChange={(e) =>
                              updateField("personalEmail", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-mobile">Mobile Number</Label>
                          <Input
                            id="profile-mobile"
                            type="tel"
                            value={formData.mobileNumber || ""}
                            onChange={handleMobileChange}
                            placeholder="+91 98765 43210"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-emergency">
                            Emergency Contact
                          </Label>
                          <Input
                            id="profile-emergency"
                            value={formData.emergencyContact || ""}
                            onChange={(e) =>
                              updateField("emergencyContact", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-gender">Gender</Label>
                          <Select
                            value={formData.gender || null}
                            onValueChange={(value) =>
                              updateField("gender", value ?? "")
                            }
                            items={GENDER_OPTIONS.map((option) => ({
                              value: option.value,
                              label: option.label,
                            }))}
                          >
                            <SelectTrigger
                              id="profile-gender"
                              className="w-full"
                            >
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDER_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Date of Birth</Label>
                          <DatePicker
                            value={formData.dob}
                            onChange={(value) => updateField("dob", value)}
                            placeholder="Select date of birth"
                            captionLayout="dropdown-buttons"
                            fromYear={1950}
                            toYear={new Date().getFullYear()}
                            isDateDisabled={(date) =>
                              date > new Date() ||
                              date < new Date("1900-01-01")
                            }
                          />
                        </div>
                        <div className="col-span-1 space-y-2 md:col-span-2">
                          <Label htmlFor="profile-address">Address</Label>
                          <Textarea
                            id="profile-address"
                            value={formData.address}
                            onChange={(e) =>
                              updateField("address", e.target.value)
                            }
                            placeholder="Street, city, state, postal code"
                            rows={3}
                            maxLength={100}
                          />
                          <p className="text-right text-xs text-gray-500">
                            {formData.address.length}/100
                          </p>
                        </div>
                      </div>
                    </div>

                    {!isOwnerOrAdmin && (
                      <div>
                        <h3 className="mb-4 border-b border-white/30 pb-2 text-lg font-semibold text-foreground dark:border-white/10">
                          Payroll, KYC & Assets
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>CTC / Salary</Label>
                            <Input
                              value={formData.ctc || ""}
                              disabled
                              className={READ_ONLY_INPUT}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Allocated Assets</Label>
                            <Input
                              value={formData.allocatedAssets || "None"}
                              disabled
                              className={READ_ONLY_INPUT}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profile-bank">
                              Bank Account No.
                            </Label>
                            <Input
                              id="profile-bank"
                              value={formData.bankAccount || ""}
                              onChange={(e) =>
                                updateField("bankAccount", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profile-ifsc">IFSC Code</Label>
                            <Input
                              id="profile-ifsc"
                              value={formData.ifsc || ""}
                              onChange={(e) =>
                                updateField(
                                  "ifsc",
                                  e.target.value.toUpperCase()
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profile-pan">PAN Number</Label>
                            <Input
                              id="profile-pan"
                              value={formData.panNumber || ""}
                              onChange={(e) =>
                                updateField(
                                  "panNumber",
                                  e.target.value.toUpperCase()
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="profile-aadhaar">
                              Aadhaar Number
                            </Label>
                            <Input
                              id="profile-aadhaar"
                              value={formData.aadhaarNumber || ""}
                              onChange={(e) =>
                                updateField("aadhaarNumber", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="glass-card overflow-hidden rounded-2xl p-6 md:p-8">
            <form onSubmit={handlePasswordSubmit} className="max-w-lg space-y-6">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Change Password
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter the temporary password provided by your administrator,
                  then set a new password.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">
                  Temporary / Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPwd.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePwd("current")}
                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      showPwd.current
                        ? "Hide current password"
                        : "Show current password"
                    }
                  >
                    {showPwd.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPwd.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    autoComplete="new-password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePwd("new")}
                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      showPwd.new ? "Hide new password" : "Show new password"
                    }
                  >
                    {showPwd.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPwd.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    autoComplete="new-password"
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePwd("confirm")}
                    className="absolute top-2.5 right-3 text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={
                      showPwd.confirm
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showPwd.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSavingPassword}
                  className="bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                >
                  {isSavingPassword ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
