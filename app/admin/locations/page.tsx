'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Home
} from 'lucide-react';

interface Location {
  _id: string;
  locationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  radius: number;
  isActive: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    locationName: '',
    lat: '',
    lng: '',
    radius: '100',
    isActive: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations');
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setError('Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: formData.locationName,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          radius: parseInt(formData.radius),
          isActive: formData.isActive
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add location');
      }

      setSuccess('Location added successfully!');
      setFormData({ locationName: '', lat: '', lng: '', radius: '100', isActive: true });
      setShowAddForm(false);
      fetchLocations();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUpdateLocation = async (location: Location) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/locations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: location._id,
          locationName: location.locationName,
          lat: location.coordinates.lat,
          lng: location.coordinates.lng,
          radius: location.radius,
          isActive: location.isActive
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setSuccess('Location updated successfully!');
      setEditingId(null);
      fetchLocations();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/locations?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete location');
      }

      setSuccess('Location deleted successfully!');
      fetchLocations();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingId(location._id);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    fetchLocations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Locations</h1>
          <p className="text-gray-600 mt-1">Manage geolocation points for attendance validation</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Add Location Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Location</h2>
          <form onSubmit={handleAddLocation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name
              </label>
              <input
                type="text"
                required
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="Main Campus Building"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius (meters)
              </label>
              <input
                type="number"
                required
                min="10"
                max="1000"
                value={formData.radius}
                onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="number"
                required
                step="any"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="36.7489"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="number"
                required
                step="any"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                placeholder="3.0588"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Location
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((location) => (
          <div
            key={location._id}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            {editingId === location._id ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={location.locationName}
                  onChange={(e) => setLocations(locations.map(l => 
                    l._id === location._id ? { ...l, locationName: e.target.value } : l
                  ))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={location.coordinates.lat}
                    onChange={(e) => setLocations(locations.map(l => 
                      l._id === location._id ? { ...l, coordinates: { ...l.coordinates, lat: parseFloat(e.target.value) } } : l
                    ))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="Latitude"
                  />
                  <input
                    type="number"
                    step="any"
                    value={location.coordinates.lng}
                    onChange={(e) => setLocations(locations.map(l => 
                      l._id === location._id ? { ...l, coordinates: { ...l.coordinates, lng: parseFloat(e.target.value) } } : l
                    ))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="Longitude"
                  />
                </div>
                <input
                  type="number"
                  value={location.radius}
                  onChange={(e) => setLocations(locations.map(l => 
                    l._id === location._id ? { ...l, radius: parseInt(e.target.value) } : l
                  ))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  placeholder="Radius (meters)"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={location.isActive}
                    onChange={(e) => setLocations(locations.map(l => 
                      l._id === location._id ? { ...l, isActive: e.target.checked } : l
                    ))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateLocation(location)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{location.locationName}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        location.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latitude:</span>
                    <span className="font-mono text-gray-900">{location.coordinates.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Longitude:</span>
                    <span className="font-mono text-gray-900">{location.coordinates.lng.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Radius:</span>
                    <span className="font-medium text-gray-900">{location.radius}m</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No locations configured</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first location
          </button>
        </div>
      )}
    </div>
  );
}
