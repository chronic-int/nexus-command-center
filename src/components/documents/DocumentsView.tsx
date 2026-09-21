import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Star,
  Trash2,
  Edit3,
  Eye,
  Clock,
  FolderKanban,
  Save,
  Tag,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Document } from '../../types';
import { Avatar } from '../common/Avatar';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    projects,
    members,
    selectedDocId,
    setSelectedDocId,
    createDocument,
    updateDocument,
    deleteDocument,
    toggleFavoriteDocument,
    setIsQuickCreateOpen,
    setQuickCreateDefaultTab,
    addToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write');

  // Currently open document
  const activeDoc = documents.find((d) => d.id === selectedDocId) || null;

  // Filtered documents list
  const filteredDocs = documents.filter((doc) => {
    if (selectedType !== 'all' && doc.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchContent = doc.content.toLowerCase().includes(q);
      if (!matchTitle && !matchContent) return false;
    }
    return true;
  });

  const docTypes = ['all', 'Spec', 'RFC', 'Architecture', 'Design System', 'Meeting Notes'];

  const handleCreateNew = () => {
    const newDoc = createDocument({
      title: 'New Technical Specification',
      type: 'Spec',
    });
    setSelectedDocId(newDoc.id);
  };

  return (
    <div className="flex-1 flex min-h-0 bg-slate-50/50 dark:bg-[#0b0f19] overflow-hidden">
      {/* Left List Pane */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-[#0f1422] shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-500" />
              Documents & RFCs
            </h2>
            <span className="text-[11px] text-slate-400">{documents.length} published specs</span>
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-xs transition-colors"
            title="Create new doc"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Type filter */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-hidden focus:border-brand-500 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {docTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
                  selectedType === t
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Document Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
          {filteredDocs.map((doc) => {
            const isSelected = activeDoc?.id === doc.id;
            const project = projects.find((p) => p.id === doc.projectId);

            return (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-brand-500/10 border border-brand-500/40 text-brand-600 dark:text-brand-400'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {doc.type}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteDocument(doc.id);
                    }}
                    className={`p-0.5 ${
                      doc.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-amber-500'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${doc.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 mb-1">
                  {doc.title}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {doc.content.replace(/^#+ .*/g, '').slice(0, 90)}...
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                  <span className="truncate max-w-[120px]">{project?.name || 'Workspace'}</span>
                  <span>{new Date(doc.lastEdited).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Editor / Reader Pane */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-[#0b0f19]">
        {activeDoc ? (
          <>
            {/* Editor Topbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#0f1422]">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) => updateDocument(activeDoc.id, { title: e.target.value })}
                  className="w-full text-base font-bold bg-transparent text-slate-900 dark:text-white outline-hidden"
                  placeholder="Document Title"
                />
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span>Last edited {new Date(activeDoc.lastEdited).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{activeDoc.type}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Mode toggle */}
                <div className="flex p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditorMode('write')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                      editorMode === 'write'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Write</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                      editorMode === 'preview'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => deleteDocument(activeDoc.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {editorMode === 'write' ? (
                <textarea
                  value={activeDoc.content}
                  onChange={(e) => updateDocument(activeDoc.id, { content: e.target.value })}
                  placeholder="Start writing Markdown specifications, requirements, or architecture notes..."
                  className="w-full h-full font-mono text-xs leading-relaxed bg-transparent text-slate-800 dark:text-slate-200 outline-hidden resize-none"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-xs space-y-3">
                  <div
                    className="space-y-3 font-sans text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: activeDoc.content
                        .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-3 mb-1.5 text-brand-500">$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold mt-2 mb-1">$1</h3>')
                        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                        .replace(/`(.*?)`/gim, '<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">$1</code>')
                    }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <FileText className="w-12 h-12 stroke-1 mb-3 text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Document Selected
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Choose a technical spec from the left sidebar or create a new document to begin editing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
