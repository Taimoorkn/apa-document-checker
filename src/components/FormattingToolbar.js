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
    <div className="px-6 py-2 flex items-center space-x-1 bg-gray-50">
      <div className="flex items-center space-x-1 pr-3 border-r border-gray-200">
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Redo"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center space-x-1 px-3">
        <button
          className={`p-2 rounded transition-colors ${
            editor?.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Bold"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          className={`p-2 rounded transition-colors ${
            editor?.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
          title="Italic"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          className={`p-2 rounded transition-colors ${
            editor?.isActive('underline') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
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