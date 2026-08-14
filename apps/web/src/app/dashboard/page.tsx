import { redirect } from "next/navigation";

const DashboardPage = () => {
  redirect("/dashboard/profile");
};

export default DashboardPage;
