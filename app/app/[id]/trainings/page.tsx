"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Loader2, Zap, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import type { Tables } from "../../../../lib/database_types";

type Training = Tables<"trainings">;

export default function TrainingsPage() {
  const params = useParams();
  const ragId = params.id as string;

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrainings();

    // Auto-refresh every 5 seconds if there are pending/processing trainings
    const interval = setInterval(() => {
      if (trainings.some(t => t.status === 'pending' || t.status === 'processing')) {
        loadTrainings(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [ragId]);

  const loadTrainings = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("trainings")
        .select("*")
        .eq("rag_id", ragId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setTrainings(data || []);
    } catch (err: any) {
      console.error("Error loading trainings:", err);
      setError(err.message || "Failed to load training history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string | null) => {
    const statusValue = status || "pending";
    const colors = {
      completed: "bg-green-100 text-green-700 border-green-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      pending: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${colors[statusValue as keyof typeof colors] || colors.pending}`}>
        {getStatusIcon(status)}
        {statusValue.charAt(0).toUpperCase() + statusValue.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const calculateDuration = (startString: string | null, endString: string | null) => {
    if (!startString || !endString) return "-";
    const start = new Date(startString);
    const end = new Date(endString);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const totalTokens = trainings.reduce((sum, t) => sum + (t.tokens_used || 0), 0);
  const totalItems = trainings.reduce((sum, t) => sum + (t.items_processed || 0), 0);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Training History</h1>
            <p className="text-sm text-gray-600 mt-1">
              View all embedding generation jobs and their status
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Items</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalItems.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Tokens</p>
              <p className="text-lg font-semibold text-gray-900">
                {totalTokens.toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => loadTrainings()}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-6xl">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {trainings.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No training jobs yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Add some content and run training to see history here
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Tokens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Dimensions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trainings.map((training) => (
                    <tr key={training.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(training.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {training.model}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {training.items_processed || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {(training.tokens_used || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {training.embedding_dimensions}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {calculateDuration(training.started_at, training.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(training.started_at || training.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {trainings.some(t => t.error_message) && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Errors</h3>
              <div className="space-y-2">
                {trainings
                  .filter(t => t.error_message)
                  .map(training => (
                    <div key={training.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-900">
                              Training failed - {training.model}
                            </p>
                            <p className="text-xs text-red-700">
                              {formatDate(training.created_at)}
                            </p>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            {training.error_message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
