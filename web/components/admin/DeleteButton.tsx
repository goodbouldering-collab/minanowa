'use client';

export function DeleteButton({ message = '本当に削除しますか？' }: { message?: string }) {
  return (
    <button
      type="submit"
      className="text-xs px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      削除
    </button>
  );
}
