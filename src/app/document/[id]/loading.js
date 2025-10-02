import AnalysisLoadingSkeleton from '@/components/loading/AnalysisLoadingSkeleton';

export default function DocumentLoading() {
  return (
    <AnalysisLoadingSkeleton
      message="Loading document analysis..."
      fileName="Fetching document..."
    />
  );
}
