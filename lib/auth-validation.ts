export interface LoginFormInput {
  readonly email: string;
  readonly password: string;
}

export interface RegisterFormInput extends LoginFormInput {
  readonly fullName: string;
}

export const validateLoginFormInput = (
  input: LoginFormInput,
): string | null => {
  const email = input.email.trim();

  if (email.length === 0) {
    return "Email wajib diisi.";
  }

  if (!email.includes("@")) {
    return "Format email belum valid.";
  }

  if (input.password.length === 0) {
    return "Password wajib diisi.";
  }

  return null;
};

export const validateRegisterFormInput = (
  input: RegisterFormInput,
): string | null => {
  if (input.fullName.trim().length === 0) {
    return "Nama lengkap wajib diisi.";
  }

  const loginError = validateLoginFormInput(input);

  if (loginError !== null) {
    return loginError;
  }

  if (input.password.length < 8) {
    return "Password minimal 8 karakter.";
  }

  return null;
};
