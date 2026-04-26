"use client";

import { useState, useTransition } from "react";
import { createUserAction } from "./actions";
import type { Role } from "@/lib/types";

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("caller");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await createUserAction({ email, password, fullName, role });
      if (res.ok) {
        setSuccess(`Created ${role}: ${email}`);
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("caller");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="form-row">
        <label className="label" htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          required
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="new-user-password">Password</label>
        <input
          id="new-user-password"
          type="text"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          minLength={6}
          required
          placeholder="At least 6 characters"
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="new-user-name">Full name</label>
        <input
          id="new-user-name"
          type="text"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="off"
          placeholder="Optional"
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="new-user-role">Role</label>
        <select
          id="new-user-role"
          className="select"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="caller">Caller</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {success && (
        <p style={{ color: "#047857", fontSize: 13, marginBottom: 12 }}>{success}</p>
      )}
      {error && (
        <p style={{ color: "#991B1B", fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create user"}
      </button>
    </form>
  );
}
