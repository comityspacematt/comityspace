import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminDocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('list');
  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: 'general',
    visibility: 'all',
    is_pinned: false,
    file: null
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.');
        return;
      }

      setUploadForm({
        ...uploadForm,
        file: file,
        title: uploadForm.title || file.name.split('.')[0] // Auto-fill title if empty
      });
      setError('');
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      setError('Please select a file to upload');
      return;
    }

    if (!uploadForm.title.trim()) {
      setError('Document title is required');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title.trim());
      formData.append('description', uploadForm.description.trim());
      formData.append('category', uploadForm.category);
      formData.append('visibility', uploadForm.visibility);
      formData.append('is_pinned', uploadForm.is_pinned.toString());

      const response = await api.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        resetUploadForm();
        setView('list');
        fetchDocuments();
      } else {
        setError(response.data.message || 'Failed to upload document');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await api.delete(`/documents/${documentId}`);

      if (response.data.success) {
        fetchDocuments();
      } else {
        setError(response.data.message || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
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

  const togglePin = async (documentId, currentPinStatus, title) => {
    try {
      const response = await api.put(`/documents/${documentId}`, {
        is_pinned: !currentPinStatus
      });

      if (response.data.success) {
        fetchDocuments();
      } else {
        setError(response.data.message || 'Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      setError('Failed to update document');
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      category: 'general',
      visibility: 'all',
      is_pinned: false,
      file: null
    });
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
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
      'admin_only': 'bg-red-100 text-red-800',
      'volunteers_only': 'bg-blue-100 text-blue-800'
    };
    return colors[visibility] || colors.all;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            View Documents
          </button>
          <button
            onClick={() => {
              resetUploadForm();
              setView('upload');
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'upload' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            Upload Document
          </button>
        </div>
      </div>

      {/* Documents List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-4">Upload your first document to get started</p>
              <button
                onClick={() => setView('upload')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Upload Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {documents.map((doc) => (
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
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleDownload(doc.id, doc.file_name)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => togglePin(doc.id, doc.is_pinned, doc.title)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          doc.is_pinned 
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {doc.is_pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id, doc.title)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Form */}
      {view === 'upload' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Upload New Document</h3>
          
          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File *
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileSelect}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: PDF, Word, Excel, text files, images (max 10MB)
              </p>
              {uploadForm.file && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm text-green-800">
                    Selected: {uploadForm.file.name} ({(uploadForm.file.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                </div>
              )}
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter document title..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="policy">Policy</option>
                  <option value="training">Training</option>
                  <option value="forms">Forms</option>
                  <option value="resources">Resources</option>
                  <option value="guidelines">Guidelines</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  value={uploadForm.visibility}
                  onChange={(e) => setUploadForm({...uploadForm, visibility: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="volunteers_only">Volunteers Only</option>
                  <option value="admin_only">Admins Only</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_pinned}
                    onChange={(e) => setUploadForm({...uploadForm, is_pinned: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Pin this document (appears at top)</span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={() => {
                  resetUploadForm();
                  setView('list');
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminDocumentManager;