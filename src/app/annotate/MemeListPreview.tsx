import { Input } from "@/components/ui/input";
import { AnnotatedMeme } from "@/types/models";
import Image from "next/image";
import {
  FileImage,
  Search,
  Filter,
  ArrowUp,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState, useMemo } from "react";

interface MemeListPreviewProps {
  memes: AnnotatedMeme[];
  selectedMeme: AnnotatedMeme;
  setSelectedMeme: Dispatch<SetStateAction<AnnotatedMeme>>;
}

export default function MemeListPreview({
  memes,
  selectedMeme,
  setSelectedMeme,
}: MemeListPreviewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Filter and search memes
  const filteredMemes = useMemo(() => {
    return memes.filter((meme) => {
      const matchesSearch =
        meme.file_name &&
        meme.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || meme.annotation_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [memes, searchQuery, statusFilter]);

  // Get unique statuses for filter
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(memes.map((meme) => meme.annotation_status))];
    return statuses.sort();
  }, [memes]);

  const handleJumpToIndex = (value: string) => {
    const index = parseInt(value);
    if (!isNaN(index) && index >= 1 && index <= filteredMemes.length) {
      const targetMeme = filteredMemes[index - 1];
      setSelectedMeme(targetMeme);

      setTimeout(() => {
        const element = document.getElementById(`meme-${targetMeme.id}`);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 200);
  };

  const scrollToTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };


  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "annotated":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending":
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "annotated":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCurrentIndex = () => {
    return filteredMemes.findIndex((meme) => meme.id === selectedMeme.id) + 1;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-2/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-gray-900">Meme Library</h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  Viewing #{getCurrentIndex()}
                </span>
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
               {filteredMemes.length} of {memes.length}
            </div>
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Search by filename..."
            />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500 bg-white text-sm"
              >
                <option value="all">All Status</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              onChange={(e) => handleJumpToIndex(e.target.value)}
              className="w-24 text-center border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Go to #"
              type="number"
              min="1"
              max={filteredMemes.length}
            />
          </div>
        </div>

        {/* Current selection indicator */}
      </div>

      {/* Meme List */}
      <div className="flex-1 relative">
        <div
          ref={listRef}
          className="max-h-[65vh] overflow-y-auto p-4 space-y-3"
          onScroll={(e)=>{
            console.log("Scroll event:", e.currentTarget.scrollTop);
            handleScroll(e)
          }}
        >
          {filteredMemes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileImage className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-center">
                {searchQuery || statusFilter !== "all"
                  ? "No memes match your search criteria"
                  : "No memes available"}
              </p>
            </div>
          ) : (
            filteredMemes.map((meme) => {
              const originalIndex =
                memes.findIndex((m) => m.id === meme.id) + 1;
              const isSelected = selectedMeme.id === meme.id;

              return (
                <div
                  key={meme.id}
                  id={`meme-${meme.id}`}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "border-blue-500 ring-6 ring-blue-200 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedMeme(meme)}
                >
                  {/* Image Container */}
                  <div className="relative aspect-video bg-gray-100 overflow-hidden">
                    {meme.uploaded_meme_url ? (
                      <Image
                        className="w-full h-full group-hover:scale-105 transition-transform duration-200"
                        src={meme.uploaded_meme_url}
                        alt={meme.file_name || 'Meme image'}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <FileImage className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="font-medium text-sm text-gray-900 truncate flex-1"
                      >
                        {meme.file_name}
                      </h3>
                      <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full shrink-0">
                        #{originalIndex}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          meme.annotation_status
                        )}`}
                      >
                        {getStatusIcon(meme.annotation_status)}
                        <span>{meme.annotation_status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Scroll to top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-4 right-4 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all duration-200 hover:scale-110 z-10"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Total: {memes.length} memes</span>
          <span>Filtered: {filteredMemes.length} showing</span>
        </div>
      </div>
    </div>
  );
}
