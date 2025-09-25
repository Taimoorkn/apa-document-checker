'use client';

import { memo } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Undo,
  Redo
} from 'lucide-react';

const FormattingToolbar = memo(({ editor }) => {
  return (
    <div className="px-6 py-3 flex items-center space-x-1 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center space-x-1 pr-3 border-r border-slate-300">
        <button
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          title="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-200"
          title="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center space-x-1 px-3">
        <button
          className={`p-2 rounded-lg transition-colors duration-200 ${
            editor?.isActive('bold') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          className={`p-2 rounded-lg transition-colors duration-200 ${
            editor?.isActive('italic') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          className={`p-2 rounded-lg transition-colors duration-200 ${
            editor?.isActive('underline') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Underline"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

FormattingToolbar.displayName = 'FormattingToolbar';

export default FormattingToolbar;