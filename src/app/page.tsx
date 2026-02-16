import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Electrolux Energy Management System
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          A web-based platform for managing electricity billing, customer accounts,
          meter readings, complaints, and employee workflows.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
