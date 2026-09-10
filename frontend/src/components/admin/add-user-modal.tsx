import { useEffect, useState } from "react";
import { Crown, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  addNewUser,
  checkEmployeeId,
  fetchAdminUserById,
  getAdminUsersErrorMessage,
  updateUserDetails,
  type AdminUser,
  type AdminUserDetail,
} from "@/services/admin-users-api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Step, Stepper } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Shared frosted-glass field styling for Add User modal inputs. */
const glassFieldClass =
  "border-white/40 bg-white/10 text-foreground shadow-none backdrop-blur-sm placeholder:text-muted-foreground focus-visible:border-white/70 dark:border-white/20 dark:bg-white/5";

interface IdStatus {
  checking: boolean;
  isUnique: boolean | null;
  error: string;
}

const EMPTY_ID_STATUS: IdStatus = {
  checking: false,
  isUnique: null,
  error: "",
};

type UserType = "staff" | "owner";

function isOwnerAccount(user: {
  role?: string;
  department?: string | null;
  designation?: string;
  team?: string | null;
}) {
  return (
    user.role === "Owner" ||
    user.role === "Administrator" ||
    user.designation === "Owner" ||
    user.department === "Owner" ||
    user.team === "Owner"
  );
}

function mapRoleToApiRole(role: string) {
  if (role === "Administrator/Owner") return "Owner";
  if (role === "Staff") return "Staff";
  return role;
}

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
] as const;

const MARITAL_STATUS_OPTIONS = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
  { value: "Prefer not to say", label: "Prefer not to say" },
] as const;

const EMPTY_FORM = {
  employeeId: "",
  firstName: "",
  lastName: "",
  role: "Staff",
  joiningDate: "",
  dateOfBirth: "",
  gender: "",
  bloodGroup: "",
  maritalStatus: "",
  languages: "",
  address: "",
  officialEmail: "",
  personalEmail: "",
  mobileNumber: "+91 ",
  alternatePhone: "+91 ",
  emergencyContactName: "",
  emergencyPhone: "+91 ",
  bankAccount: "",
  ifsc: "",
  panNumber: "",
  aadhaarNumber: "",
  temporaryPassword: "",
};

const TODAY_MAX_DATE = new Date().toISOString().split("T")[0];

const EMAIL_REGEX = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void> | void;
  isEditMode?: boolean;
  selectedUser?: AdminUser | null;
}

function formatDateForInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function formatIndianPhone(raw: string) {
  let inputVal = raw;
  if (!inputVal.startsWith("+91")) inputVal = "+91 ";
  const digits = inputVal.substring(4).replace(/\D/g, "").slice(0, 10);
  let formattedNumber = "+91 ";
  if (digits.length > 0) formattedNumber += digits.slice(0, 5);
  if (digits.length > 5) formattedNumber += ` ${digits.slice(5)}`;
  return formattedNumber;
}

function mapAdminUserDetailToForm(user: AdminUserDetail) {
  const rawMobile = user.mobileNumber || user.phone || "";
  let mobileNumber = "+91 ";
  if (rawMobile.startsWith("+91")) {
    mobileNumber = rawMobile;
  } else if (rawMobile) {
    mobileNumber = formatIndianPhone(rawMobile);
  }

  const rawAlternate = user.alternatePhone || "";
  const rawEmergencyPhone = user.emergencyPhone || "";

  return {
    employeeId: user.employeeId || "",
    firstName: user.firstName || user.name.split(" ")[0] || "",
    lastName: user.lastName || user.name.split(" ").slice(1).join(" ") || "",
    role: isOwnerAccount(user) ? "Administrator/Owner" : "Staff",
    joiningDate: formatDateForInput(user.joiningDate ?? user.joinedDate),
    dateOfBirth: formatDateForInput(user.dateOfBirth ?? user.dob),
    gender: user.gender || "",
    bloodGroup: user.bloodGroup || "",
    maritalStatus: user.maritalStatus || "",
    languages: user.languages || "",
    address: user.address || "",
    officialEmail: user.officialEmail || user.email || "",
    personalEmail: user.personalEmail || "",
    mobileNumber,
    alternatePhone: rawAlternate
      ? formatIndianPhone(rawAlternate)
      : "+91 ",
    emergencyContactName:
      user.emergencyContactName || "",
    emergencyPhone: rawEmergencyPhone
      ? formatIndianPhone(rawEmergencyPhone)
      : "+91 ",
    bankAccount: user.bankAccount || "",
    ifsc: user.ifsc || "",
    panNumber: user.panNumber || "",
    aadhaarNumber: user.aadhaarNumber || "",
    temporaryPassword: "",
  };
}

function normalizeAadhaar(value: string) {
  return value.replace(/\s+/g, "");
}

function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value.trim());
}

function getUserId(user: { _id?: string; id?: string } | null | undefined) {
  if (!user) return "";
  return user._id || user.id || "";
}

export function AddUserModal({
  open,
  onOpenChange,
  onCreated,
  isEditMode = false,
  selectedUser = null,
}: AddUserModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [userType, setUserType] = useState<UserType | null>(null);
  const totalSteps = userType === "owner" ? 2 : 3;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [idStatus, setIdStatus] = useState<IdStatus>(EMPTY_ID_STATUS);
  const isOwnerFlow = userType === "owner";

  useEffect(() => {
    if (!open) return;

    if (!isEditMode) {
      resetForm();
      return;
    }

    if (!selectedUser) return;

    const userId = getUserId(selectedUser);
    if (!userId) return;
    let cancelled = false;

    async function loadUserForEdit() {
      setIsLoadingUser(true);
      try {
        const response = await fetchAdminUserById(userId);
        if (cancelled) return;

        const mapped = mapAdminUserDetailToForm(response.data.user);
        setFormData(mapped);
        setUserType(isOwnerAccount(response.data.user) ? "owner" : "staff");
        setIdStatus({ checking: false, isUnique: true, error: "" });
      } catch (error) {
        if (!cancelled) {
          toast.error(
            getAdminUsersErrorMessage(error, "Failed to load user details.")
          );
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setIsLoadingUser(false);
      }
    }

    void loadUserForEdit();

    return () => {
      cancelled = true;
    };
  }, [open, isEditMode, selectedUser?.id, onOpenChange]);

  useEffect(() => {
    const checkId = async () => {
      if (!formData.employeeId || formData.employeeId.trim() === "") {
        setIdStatus({ checking: false, isUnique: null, error: "" });
        return;
      }

      setIdStatus({ checking: true, isUnique: null, error: "" });

      try {
        const { isUnique } = await checkEmployeeId(
          formData.employeeId.trim(),
          isEditMode ? getUserId(selectedUser) : undefined
        );
        setIdStatus({
          checking: false,
          isUnique,
          error: isUnique ? "" : "This Employee ID is already taken.",
        });
      } catch {
        setIdStatus({
          checking: false,
          isUnique: null,
          error: "Error checking ID",
        });
      }
    };

    const timeoutId = window.setTimeout(() => {
      void checkId();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [formData.employeeId, isEditMode, selectedUser?.id]);

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelectChange(
    name: keyof typeof EMPTY_FORM,
    value: string | null
  ) {
    setFormData((prev) => ({ ...prev, [name]: value ?? "" }));
  }

  // 1. Name Logic (Alphabets and spaces only)
  const handleNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "firstName" | "lastName"
  ) => {
    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setFormData({ ...formData, [field]: lettersOnly });
  };

  const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanId = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    setFormData({ ...formData, employeeId: cleanId });
  };

  // 2. Phone Number Logic
  const handlePhoneFieldChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "mobileNumber" | "alternatePhone" | "emergencyPhone"
  ) => {
    setFormData({
      ...formData,
      [field]: formatIndianPhone(e.target.value),
    });
  };

  // 3. Specific Data Formatters
  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({
      ...formData,
      bankAccount: e.target.value.replace(/\D/g, "").slice(0, 18),
    });
  const handleIFSCChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({
      ...formData,
      ifsc: e.target.value.toUpperCase().slice(0, 11),
    });
  const handlePANChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({
      ...formData,
      panNumber: e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10),
    });
  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({
      ...formData,
      aadhaarNumber: e.target.value.replace(/\D/g, "").slice(0, 12),
    });

  function resetForm() {
    setFormData(EMPTY_FORM);
    setIdStatus(EMPTY_ID_STATUS);
    if (!isEditMode) {
      setUserType(null);
    }
  }

  function selectStaffType() {
    setFormData((prev) => ({
      ...prev,
      role: "Staff",
    }));
    setUserType("staff");
  }

  function selectOwnerType() {
    setFormData((prev) => ({
      ...prev,
      role: "Administrator/Owner",
    }));
    setUserType("owner");
  }

  function returnToTypeSelection() {
    setUserType(null);
    setFormData(EMPTY_FORM);
    setIdStatus(EMPTY_ID_STATUS);
  }

  function getMobileDigits(value: string) {
    return value.replace(/\D/g, "").replace(/^91/, "").slice(0, 10);
  }

  function validateStep(stepIndex: number): boolean {
    /**
     * Step routing (0-based Stepper index):
     * Staff — 0 Basic, 1 Contact, 2 Payroll
     * Owner — 0 Basic, 1 Contact
     */
    if (isOwnerFlow) {
      switch (stepIndex) {
        case 0: {
          if (!formData.firstName.trim()) {
            toast.error("First name is required.");
            return false;
          }
          if (!formData.lastName.trim()) {
            toast.error("Last name is required.");
            return false;
          }
          return true;
        }
        case 1: {
          if (!formData.officialEmail.trim()) {
            toast.error("Official email is required.");
            return false;
          }
          if (!isValidEmail(formData.officialEmail)) {
            toast.error("Please enter a valid official email address.");
            return false;
          }
          {
            const mobileDigits = getMobileDigits(formData.mobileNumber);
            if (mobileDigits.length === 0) {
              toast.error("Mobile number is required.");
              return false;
            }
            if (mobileDigits.length !== 10 || !/^[6-9]/.test(mobileDigits)) {
              toast.error(
                "Please enter a valid 10-digit Indian mobile number."
              );
              return false;
            }
          }
          if (!isEditMode) {
            if (!formData.temporaryPassword) {
              toast.error("Temporary password is required.");
              return false;
            }
            if (formData.temporaryPassword.length < 6) {
              toast.error(
                "Temporary password must be at least 6 characters."
              );
              return false;
            }
          }
          return true;
        }
        default:
          return true;
      }
    }

    if (idStatus.isUnique === false) {
      return false;
    }

    switch (stepIndex) {
      case 0: {
        if (!formData.employeeId.trim()) {
          toast.error("Employee ID is required.");
          return false;
        }
        if (idStatus.checking) {
          toast.error("Please wait while we verify the employee ID.");
          return false;
        }
        if (idStatus.isUnique !== true) {
          toast.error(
            idStatus.error || "Please enter a valid, unique employee ID."
          );
          return false;
        }
        if (!formData.firstName.trim()) {
          toast.error("First name is required.");
          return false;
        }
        if (!formData.lastName.trim()) {
          toast.error("Last name is required.");
          return false;
        }
        if (!formData.joiningDate) {
          toast.error("Date of joining is required.");
          return false;
        }
        return true;
      }
      case 1: {
        if (!formData.officialEmail.trim()) {
          toast.error("Official email is required.");
          return false;
        }
        if (!isValidEmail(formData.officialEmail)) {
          toast.error("Please enter a valid official email address.");
          return false;
        }
        if (
          formData.personalEmail.trim() &&
          !isValidEmail(formData.personalEmail)
        ) {
          toast.error("Please enter a valid personal email address.");
          return false;
        }
        {
          const mobileDigits = getMobileDigits(formData.mobileNumber);
          if (mobileDigits.length > 0 && mobileDigits.length !== 10) {
            toast.error(
              "Please enter a valid 10-digit Indian mobile number."
            );
            return false;
          }
          if (mobileDigits.length === 10 && !/^[6-9]/.test(mobileDigits)) {
            toast.error(
              "Please enter a valid 10-digit Indian mobile number."
            );
            return false;
          }
        }
        {
          const altDigits = getMobileDigits(formData.alternatePhone);
          if (altDigits.length > 0 && altDigits.length !== 10) {
            toast.error(
              "Please enter a valid 10-digit alternate phone number."
            );
            return false;
          }
          if (altDigits.length === 10 && !/^[6-9]/.test(altDigits)) {
            toast.error(
              "Please enter a valid 10-digit alternate phone number."
            );
            return false;
          }
        }
        {
          const emergencyDigits = getMobileDigits(formData.emergencyPhone);
          if (emergencyDigits.length > 0 && emergencyDigits.length !== 10) {
            toast.error(
              "Please enter a valid 10-digit emergency phone number."
            );
            return false;
          }
          if (
            emergencyDigits.length === 10 &&
            !/^[6-9]/.test(emergencyDigits)
          ) {
            toast.error(
              "Please enter a valid 10-digit emergency phone number."
            );
            return false;
          }
        }
        return true;
      }
      case 2: {
        if (!isEditMode) {
          if (!formData.temporaryPassword) {
            toast.error("Temporary password is required.");
            return false;
          }
          if (formData.temporaryPassword.length < 6) {
            toast.error("Temporary password must be at least 6 characters.");
            return false;
          }
        }
        if (
          formData.ifsc.trim() &&
          !IFSC_REGEX.test(formData.ifsc.trim().toUpperCase())
        ) {
          toast.error("Please enter a valid IFSC code (e.g. HDFC0001234).");
          return false;
        }
        if (
          formData.panNumber.trim() &&
          !PAN_REGEX.test(formData.panNumber.trim().toUpperCase())
        ) {
          toast.error("Please enter a valid PAN (e.g. ABCDE1234F).");
          return false;
        }
        if (
          formData.aadhaarNumber.trim() &&
          !AADHAAR_REGEX.test(normalizeAadhaar(formData.aadhaarNumber))
        ) {
          toast.error("Aadhaar must be exactly 12 digits.");
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  }

  async function handleSubmit() {
    if (!isOwnerFlow && idStatus.isUnique === false) return;

    for (let step = 0; step < totalSteps; step += 1) {
      if (!validateStep(step)) return;
    }

    setIsSubmitting(true);
    try {
      const phone =
        getMobileDigits(formData.mobileNumber).length === 10
          ? formData.mobileNumber.trim()
          : undefined;
      const alternatePhone =
        !isOwnerFlow &&
        getMobileDigits(formData.alternatePhone).length === 10
          ? formData.alternatePhone.trim()
          : undefined;
      const emergencyPhone =
        !isOwnerFlow &&
        getMobileDigits(formData.emergencyPhone).length === 10
          ? formData.emergencyPhone.trim()
          : undefined;

      const payload = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        work_email: formData.officialEmail.trim().toLowerCase(),
        personal_email: isOwnerFlow
          ? undefined
          : formData.personalEmail.trim() || undefined,
        employee_id: isOwnerFlow
          ? undefined
          : formData.employeeId.trim() || undefined,
        role: mapRoleToApiRole(
          isOwnerFlow ? "Administrator/Owner" : "Staff"
        ),
        status: isEditMode ? undefined : ("Pending invite" as const),
        date_of_joining: isOwnerFlow
          ? undefined
          : formData.joiningDate || undefined,
        date_of_birth: isOwnerFlow
          ? undefined
          : formData.dateOfBirth || undefined,
        gender: isOwnerFlow ? undefined : formData.gender || undefined,
        blood_group: isOwnerFlow
          ? undefined
          : formData.bloodGroup || undefined,
        marital_status: isOwnerFlow
          ? undefined
          : formData.maritalStatus || undefined,
        languages: isOwnerFlow
          ? undefined
          : formData.languages.trim() || undefined,
        address: isOwnerFlow
          ? undefined
          : formData.address.trim() || undefined,
        phone,
        alternate_phone: alternatePhone,
        emergencyContactName: isOwnerFlow
          ? undefined
          : formData.emergencyContactName.trim() || undefined,
        emergencyPhone: emergencyPhone,
        temporaryPassword: isEditMode
          ? undefined
          : formData.temporaryPassword,
      };

      if (isEditMode && selectedUser) {
        await updateUserDetails(getUserId(selectedUser), payload);
        toast.success("User updated successfully.");
      } else {
        await addNewUser(payload);
        toast.success("User invited successfully.");
      }

      resetForm();
      onOpenChange(false);
      await onCreated();
    } catch (error) {
      toast.error(
        getAdminUsersErrorMessage(
          error,
          isEditMode ? "Failed to update user." : "Failed to add user."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the account profile."
              : !userType
                ? "Choose the type of account you want to create."
                : isOwnerFlow
                  ? `Owner / Administration profile setup (${totalSteps} steps).`
                  : `Staff HR onboarding (${totalSteps} steps).`}
          </DialogDescription>
        </DialogHeader>

        {isLoadingUser ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading user details...
          </div>
        ) : !isEditMode && !userType ? (
          <div className="px-4 py-8 text-center">
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              Select Profile Type
            </h3>
            <p className="mb-8 text-sm text-gray-500">
              Choose the type of account you want to create.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={selectStaffType}
                className="cursor-pointer rounded-xl border-2 border-gray-100 bg-white p-6 text-left transition-all hover:border-blue-500 hover:shadow-md"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Users className="size-6" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800">
                  Staff Member
                </h4>
                <p className="mt-1 text-xs text-gray-400">
                  HR onboarding and payroll setup.
                </p>
              </button>
              <button
                type="button"
                onClick={selectOwnerType}
                className="cursor-pointer rounded-xl border-2 border-gray-100 bg-white p-6 text-left transition-all hover:border-blue-500 hover:shadow-md"
              >
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Crown className="size-6" />
                </div>
                <h4 className="text-lg font-semibold text-gray-800">
                  Owner / Administration
                </h4>
                <p className="mt-1 text-xs text-gray-400">
                  Simplified profile setup without employee tracking fields.
                </p>
              </button>
            </div>
          </div>
        ) : (
        <form
          autoComplete="off"
          onSubmit={(event) => event.preventDefault()}
        >
        {!isEditMode ? (
          <button
            type="button"
            onClick={() => {
              setUserType(null);
              setFormData(EMPTY_FORM);
              setIdStatus(EMPTY_ID_STATUS);
            }}
            className="mb-4 flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            ← Change profile type
          </button>
        ) : null}
        <Stepper
          key={`${open ? "open" : "closed"}-${userType}-${isEditMode ? selectedUser?.id ?? "edit" : "add"}`}
          totalSteps={totalSteps}
          onValidateStep={validateStep}
          onFinalStepCompleted={handleSubmit}
          onBackFromFirst={!isEditMode ? returnToTypeSelection : undefined}
          isSubmitting={isSubmitting}
          finalLabel={isEditMode ? "Save Changes" : "Add User"}
        >
          <Step
            title="Basic Profile"
            description={
              isOwnerFlow ? "Name" : "Personal & work information"
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!isOwnerFlow ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">
                      Employee ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="employeeId"
                      value={formData.employeeId || ""}
                      onChange={handleEmployeeIdChange}
                      placeholder="e.g., DIV001"
                      required
                      autoComplete="off"
                      className={cn(
                        glassFieldClass,
                        idStatus.isUnique === false &&
                          "border-red-500 focus-visible:ring-red-500",
                        idStatus.isUnique === true &&
                          "border-green-500 focus-visible:ring-green-500"
                      )}
                    />
                    {idStatus.checking ? (
                      <p className="animate-pulse text-xs text-blue-500">
                        Checking availability...
                      </p>
                    ) : null}
                    {idStatus.isUnique === true ? (
                      <p className="text-xs text-green-600">
                        Employee ID is available.
                      </p>
                    ) : null}
                    {idStatus.isUnique === false ? (
                      <p className="text-xs text-red-500">{idStatus.error}</p>
                    ) : null}
                    {idStatus.error &&
                    idStatus.isUnique === null &&
                    !idStatus.checking ? (
                      <p className="text-xs text-red-500">{idStatus.error}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joiningDate">
                      Date of Joining{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="joiningDate"
                      name="joiningDate"
                      type="date"
                      max={TODAY_MAX_DATE}
                      value={formData.joiningDate}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      className={glassFieldClass}
                    />
                  </div>
                </>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleNameChange(e, "firstName")}
                  required
                  autoComplete="none"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleNameChange(e, "lastName")}
                  required
                  autoComplete="none"
                  className={glassFieldClass}
                />
              </div>
              {!isOwnerFlow ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      max={TODAY_MAX_DATE}
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      autoComplete="off"
                      className={glassFieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        handleSelectChange("gender", value)
                      }
                      items={GENDER_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    >
                      <SelectTrigger
                        id="gender"
                        className={cn("w-full", glassFieldClass)}
                      >
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Select
                      value={formData.bloodGroup}
                      onValueChange={(value) =>
                        handleSelectChange("bloodGroup", value)
                      }
                      items={BLOOD_GROUP_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    >
                      <SelectTrigger
                        id="bloodGroup"
                        className={cn("w-full", glassFieldClass)}
                      >
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUP_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maritalStatus">Marital Status</Label>
                    <Select
                      value={formData.maritalStatus}
                      onValueChange={(value) =>
                        handleSelectChange("maritalStatus", value)
                      }
                      items={MARITAL_STATUS_OPTIONS.map((option) => ({
                        value: option.value,
                        label: option.label,
                      }))}
                    >
                      <SelectTrigger
                        id="maritalStatus"
                        className={cn("w-full", glassFieldClass)}
                      >
                        <SelectValue placeholder="Select marital status" />
                      </SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input
                      id="languages"
                      name="languages"
                      value={formData.languages}
                      onChange={handleChange}
                      placeholder="e.g. English, Hindi, Marathi"
                      autoComplete="off"
                      className={glassFieldClass}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Residential address"
                      rows={3}
                      autoComplete="off"
                      className={glassFieldClass}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Step>

          {/*
            Dynamic step routing:
            - Staff: 1 Basic → 2 Contact → 3 Payroll
            - Owner: 1 Basic → 2 Contact
          */}
          {userType === "owner" ? (
            <Step title="Contact Info" description="Email, phone & access">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="officialEmail">
                    Official Email ID{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="officialEmail"
                    name="officialEmail"
                    type="email"
                    value={formData.officialEmail}
                    onChange={handleChange}
                    required
                    placeholder="name@divniq.com"
                    autoComplete="none"
                    className={glassFieldClass}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="mobileNumber">
                    Mobile Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      handlePhoneFieldChange(e, "mobileNumber")
                    }
                    placeholder="+91 XXXXX XXXXX"
                    autoComplete="off"
                    className={glassFieldClass}
                  />
                </div>
                {!isEditMode ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="temporaryPassword-owner">
                      Temporary Password{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="temporaryPassword-owner"
                      name="temporaryPassword"
                      type="password"
                      value={formData.temporaryPassword}
                      onChange={handleChange}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className={glassFieldClass}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Use Reset Password from the actions menu to change the
                    password.
                  </p>
                )}
              </div>
            </Step>
          ) : null}

          {userType === "staff" ? (
          <Step title="Contact Info" description="Emails & phone">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="officialEmail">
                  Work Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="officialEmail"
                  name="officialEmail"
                  type="email"
                  value={formData.officialEmail}
                  onChange={handleChange}
                  required
                  placeholder="name@divniq.com"
                  autoComplete="none"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  name="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={handleChange}
                  placeholder="name@gmail.com"
                  autoComplete="none"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Phone</Label>
                <Input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  value={formData.mobileNumber}
                  onChange={(e) => handlePhoneFieldChange(e, "mobileNumber")}
                  placeholder="+91 XXXXX XXXXX"
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternatePhone">Alternate Phone</Label>
                <Input
                  id="alternatePhone"
                  name="alternatePhone"
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) =>
                    handlePhoneFieldChange(e, "alternatePhone")
                  }
                  placeholder="+91 XXXXX XXXXX"
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">
                  Emergency Contact (Name / Relation)
                </Label>
                <Input
                  id="emergencyContactName"
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
                  placeholder="e.g. Rahul Sharma (Father)"
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                <Input
                  id="emergencyPhone"
                  name="emergencyPhone"
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) =>
                    handlePhoneFieldChange(e, "emergencyPhone")
                  }
                  placeholder="+91 XXXXX XXXXX"
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
            </div>
          </Step>
          ) : null}

          {userType === "staff" ? (
          <Step title="Payroll" description="Banking & access">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bank Account</Label>
                <Input
                  id="bankAccount"
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleBankChange}
                  placeholder="Account number"
                  inputMode="numeric"
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifsc">IFSC</Label>
                <Input
                  id="ifsc"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={handleIFSCChange}
                  placeholder="HDFC0001234"
                  className={cn("uppercase", glassFieldClass)}
                  maxLength={11}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="panNumber">PAN Number</Label>
                <Input
                  id="panNumber"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handlePANChange}
                  placeholder="ABCDE1234F"
                  className={cn("uppercase", glassFieldClass)}
                  maxLength={10}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
                <Input
                  id="aadhaarNumber"
                  name="aadhaarNumber"
                  value={formData.aadhaarNumber}
                  onChange={handleAadhaarChange}
                  placeholder="[Aadhaar Redacted]"
                  inputMode="numeric"
                  maxLength={12}
                  autoComplete="off"
                  className={glassFieldClass}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="temporaryPassword">
                  Temporary Password{" "}
                  {!isEditMode ? (
                    <span className="text-destructive">*</span>
                  ) : null}
                </Label>
                {isEditMode ? (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep the current password. Use Reset Password
                    from the actions menu to generate a new one.
                  </p>
                ) : null}
                {!isEditMode ? (
                <Input
                  id="temporaryPassword"
                  name="temporaryPassword"
                  type="password"
                  value={formData.temporaryPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={glassFieldClass}
                />
                ) : null}
              </div>
            </div>
          </Step>
          ) : null}
        </Stepper>
        </form>
        )}

        {isSubmitting ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {isEditMode ? "Saving changes..." : "Creating invite..."}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
