"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, Zap } from "lucide-react";

interface Training {
  id: string;
  model: string;
  status: "pending" | "processing" | "completed" | "failed";
  items_processed: number;
  tokens_used: number;
  embedding_dimensions: number;
  created_at: Date;
  completed_at?: Date;
  error_message?: string;
}

export default function TrainingsPage() {
  // Mock data - in production, fetch from Supabase
  const [trainings] = useState<Training[]>([
    {
      id: "1",
      model: "text-embedding-3-small",
      status: "completed",
      items_processed: 25,
      tokens_used: 12500,
      embedding_dimensions: 1536,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
      completed_at: new Date(Date.now() - 1000 * 60 * 60 * 2 + 1000 * 45),
    },
    {
      id: "2",
      model: "text-embedding-3-small",
      status: "completed",
      items_processed: 15,
      tokens_used: 7200,
      embedding_dimensions: 1536,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
      completed_at: new Date(Date.now() - 1000 * 60 * 60 * 24 + 1000 * 30),
    },
    {
      id: "3",
      model: "text-embedding-3-large",
      status: "failed",
      items_processed: 3,
      tokens_used: 1800,
      embedding_dimensions: 3072,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
      error_message: "API rate limit exceeded",
    },
  ]);

  const getStatusIcon = (status: Training["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "pending":
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Training["status"]) => {
    const colors = {
      completed: "bg-green-100 text-green-700 border-green-200",
      failed: "bg-red-100 text-red-700 border-red-200",
      processing: "bg-blue-100 text-blue-700 border-blue-200",
      pending: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${colors[status]}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const calculateDuration = (start: Date, end?: Date) => {
    if (!end) return "-";
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

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
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Tokens Used</p>
              <p className="text-lg font-semibold text-gray-900">
                {trainings.reduce((sum, t) => sum + t.tokens_used, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        <div className="max-w-6xl">
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
                        {training.items_processed}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {training.tokens_used.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {training.embedding_dimensions}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {calculateDuration(training.created_at, training.completed_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatDate(training.created_at)}
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
                        <div>
                          <p className="text-sm font-medium text-red-900">
                            Training failed at {formatDate(training.created_at)}
                          </p>
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





