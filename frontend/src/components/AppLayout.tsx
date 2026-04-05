import { Outlet } from "react-router-dom";
import { ShellLayout } from "./ShellLayout";

export function AppLayout() {
  return (
    <ShellLayout>
      <Outlet />
    </ShellLayout>
  );
}
