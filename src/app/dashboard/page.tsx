import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Welcome, {session.user?.email} &mdash; Role: {(session.user as any)?.userType}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-lg mb-1">Bills</h3>
            <p className="text-gray-500 text-sm">View and pay your electricity bills</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-lg mb-1">Complaints</h3>
            <p className="text-gray-500 text-sm">Submit and track complaints</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-lg mb-1">Profile</h3>
            <p className="text-gray-500 text-sm">Manage your account details</p>
          </div>
        </div>
      </div>
    </main>
  );
}
