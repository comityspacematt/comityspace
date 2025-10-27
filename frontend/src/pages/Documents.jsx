import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Documents = () => {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Document preview modal state
  const [documentPreview, setDocumentPreview] = useState({
    isOpen: false,
    document: null,
    loading: false
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');

      if (response.data.success) {
        setDocuments(response.data.documents);
      } else {
        setError(response.data.message || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  // Handle document preview
  const handlePreviewDocument = async (document) => {
    setDocumentPreview({
      isOpen: true,
      document: document,
      loading: true,
      previewUrl: null
    });

    // Fetch document with authentication to create preview URL
    try {
      const response = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob',
      });

      // Create object URL from blob
      const blob = new Blob([response.data], { type: document.file_type });
      const previewUrl = window.URL.createObjectURL(blob);

      setDocumentPreview(prev => ({
        ...prev,
        loading: false,
        previewUrl: previewUrl
      }));
    } catch (error) {
      console.error('Error generating preview:', error);
      setDocumentPreview(prev => ({
        ...prev,
        loading: false,
        previewUrl: null
      }));
    }
  };

  // Close document preview modal
  const closeDocumentPreview = () => {
    // Clean up object URL to prevent memory leaks
    if (documentPreview.previewUrl) {
      window.URL.revokeObjectURL(documentPreview.previewUrl);
    }

    setDocumentPreview({
      isOpen: false,
      document: null,
      loading: false,
      previewUrl: null
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text')) return '📋';
    return '📁';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'policy': 'bg-red-100 text-red-800',
      'training': 'bg-blue-100 text-blue-800',
      'forms': 'bg-green-100 text-green-800',
      'resources': 'bg-purple-100 text-purple-800',
      'guidelines': 'bg-yellow-100 text-yellow-800',
      'general': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.general;
  };

  const getVisibilityColor = (visibility) => {
    const colors = {
      'all': 'bg-green-100 text-green-800',
      'volunteers_only': 'bg-blue-100 text-blue-800'
    };
    return colors[visibility] || colors.all;
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    return doc.category === filter;
  });

  const categories = [...new Set(documents.map(doc => doc.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {user?.organizationName} - Documents
                </h1>
              </div>

              {/* Navigation */}
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  🏠 Dashboard
                </Link>
                <Link
                  to="/volunteers"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  👥 Volunteers
                </Link>
                <Link
                  to="/my-tasks"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  ✅ My Tasks
                </Link>
                <Link
                  to="/calendar"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  📅 Calendar
                </Link>
                <Link
                  to="/documents"
                  className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  📄 Documents
                </Link>

                <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                  <span className="text-sm text-gray-600">
                    {user?.firstName || user?.email}
                  </span>
                  <button
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {user?.organizationName} - Documents
              </h1>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                🏠 Dashboard
              </Link>
              <Link
                to="/volunteers"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                👥 Volunteers
              </Link>
              <Link
                to="/my-tasks"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                ✅ My Tasks
              </Link>
              <Link
                to="/calendar"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                📅 Calendar
              </Link>
              <Link
                to="/documents"
                className="bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                📄 Documents
              </Link>

              <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
                <Link
                  to="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {user?.firstName || user?.email}
                </Link>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">📄 Documents</h2>
          <p className="text-gray-600">Access and download organization documents</p>
        </div>

        {/* Filter Bar */}
        {categories.length > 1 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Categories ({documents.length})
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                    filter === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category} ({documents.filter(doc => doc.category === category).length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white rounded-lg shadow">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' ? 'No documents available' : `No ${filter} documents`}
              </h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'Check back later for new documents.'
                  : 'Try selecting a different category.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-3xl">{getFileIcon(doc.file_type)}</div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                          {doc.is_pinned && (
                            <span className="text-yellow-500 text-sm">📌 Pinned</span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(doc.category)}`}>
                            {doc.category}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getVisibilityColor(doc.visibility)}`}>
                            {doc.visibility.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          {doc.description && (
                            <p className="mb-2">{doc.description}</p>
                          )}
                          <div className="flex items-center space-x-4">
                            <span>📁 {doc.file_name}</span>
                            <span>📏 {doc.file_size_mb} MB</span>
                            <span>📅 {new Date(doc.created_at).toLocaleDateString()}</span>
                            {doc.uploader_name && (
                              <span>👤 {doc.uploader_name} {doc.uploader_lastname}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => handlePreviewDocument(doc)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        👁️ Preview
                      </button>
                      <button
                        onClick={() => handleDownload(doc.id, doc.file_name)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        📥 Download
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Modal */}
      {documentPreview.isOpen && documentPreview.document && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {getFileIcon(documentPreview.document.file_type)} {documentPreview.document.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  📁 {documentPreview.document.file_name} • {documentPreview.document.file_size_mb} MB
                </p>
              </div>
              <button
                onClick={closeDocumentPreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Document Details</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Category:</dt>
                        <dd className="text-gray-900 capitalize">{documentPreview.document.category}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Size:</dt>
                        <dd className="text-gray-900">{documentPreview.document.file_size_mb} MB</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Upload Date:</dt>
                        <dd className="text-gray-900">{formatDate(documentPreview.document.created_at)}</dd>
                      </div>
                      {documentPreview.document.uploader_name && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Uploaded by:</dt>
                          <dd className="text-gray-900">
                            {documentPreview.document.uploader_name} {documentPreview.document.uploader_lastname}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Visibility:</dt>
                        <dd className="text-gray-900 capitalize">{documentPreview.document.visibility.replace('_', ' ')}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-sm text-gray-700">
                      {documentPreview.document.description || 'No description provided.'}
                    </p>
                    {documentPreview.document.is_pinned && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          📌 Pinned Document
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Preview */}
              {documentPreview.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-gray-600">Loading preview...</p>
                </div>
              ) : documentPreview.previewUrl ? (
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  {/* PDF Preview */}
                  {documentPreview.document.file_type.includes('pdf') && (
                    <iframe
                      src={documentPreview.previewUrl}
                      className="w-full h-[500px] border-0"
                      title="PDF Preview"
                    />
                  )}

                  {/* Image Preview */}
                  {documentPreview.document.file_type.includes('image') && (
                    <img
                      src={documentPreview.previewUrl}
                      alt={documentPreview.document.title}
                      className="w-full h-auto max-h-[500px] object-contain"
                    />
                  )}

                  {/* Other file types notice */}
                  {!documentPreview.document.file_type.includes('pdf') &&
                   !documentPreview.document.file_type.includes('image') && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <div className="text-blue-600 text-4xl mb-3">{getFileIcon(documentPreview.document.file_type)}</div>
                      <h4 className="text-blue-800 font-medium mb-2">Preview Not Available</h4>
                      <p className="text-blue-700 text-sm">
                        Preview is not available for this file type. Please download the document to view its contents.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-blue-600 mr-3 text-lg">ℹ️</div>
                    <div>
                      <h4 className="text-blue-800 font-medium">Document Preview</h4>
                      <p className="text-blue-700 text-sm mt-1">
                        Unable to load preview. Please download the document to view its contents.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={closeDocumentPreview}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownload(documentPreview.document.id, documentPreview.document.file_name);
                  closeDocumentPreview();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                📥 Download Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;