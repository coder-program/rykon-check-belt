"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-4">
        <h1 className="text-6xl font-bold text-red-600">Erro</h1>
        <p className="mt-4 text-xl text-gray-600">Algo deu errado!</p>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <button
          onClick={() => reset()}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
