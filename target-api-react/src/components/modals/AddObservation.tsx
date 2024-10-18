/*
 * (c) Copyright 2024 Palantir Technologies Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Icon, IconSize } from '@blueprintjs/core';
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectAddObservationError, selectAddObservationResponse } from '../../features/targetApiGateway/targetApiGateway.selectors';
import { addObservation, AddObservationPayload, clearAddObservationResponse, loadTargetsWithoutLoading, Target } from '../../features/targetApiGateway/targetApiGateway.slice';

interface AddObservationProps {
  selectedTarget: Target;
  onClose: () => void;
  initialLat: number;
  initialLon: number;
}

const AddObservation: React.FC<AddObservationProps> = ({ selectedTarget, onClose, initialLat, initialLon }) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const addObservationError = useSelector(selectAddObservationError);
  const addObservationResponse = useSelector(selectAddObservationResponse);
  const [hasDispatchedLoadTargets, setHasDispatchedLoadTargets] = useState(false);

  useEffect(() => {
    if (selectedTarget) {
      setFormData({
        targetId: selectedTarget.rid,
        name: selectedTarget.name,
        observationTimestamp: new Date().toISOString(),
        latitude: initialLat.toString(),
        longitude: initialLon.toString(),
        radius: selectedTarget.location?.radius.toString() || "1.0",
        elevation: selectedTarget.location?.elevation?.toString() || "0",
        baseRevisionId: selectedTarget.baseRevisionId.toString()
      });
    }
  }, [selectedTarget, initialLat, initialLon]);

  useEffect(() => {
    return () => {
      dispatch(clearAddObservationResponse());
    };
  }, [dispatch]);

  useEffect(() => {
    if (addObservationResponse && !hasDispatchedLoadTargets) {
      const timer = setTimeout(() => {
        dispatch(loadTargetsWithoutLoading());
        setHasDispatchedLoadTargets(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [addObservationResponse, dispatch, hasDispatchedLoadTargets]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prevState => ({
        ...prevState,
        [name]: false
      }));
    }
    dispatch(clearAddObservationResponse());
    setHasDispatchedLoadTargets(false);
  };

  const validateLatLon = (lat: number, lon: number) => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const requiredFields = ['targetId', 'observationTimestamp', 'latitude', 'longitude'];
    const newErrors: { [key: string]: boolean } = {};
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = true;
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      const latitude = parseFloat(formData.latitude);
      const longitude = parseFloat(formData.longitude);

      if (!validateLatLon(latitude, longitude)) {
        newErrors['latitude'] = true;
        newErrors['longitude'] = true;
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors(newErrors);
    } else {
      const observationPayload: AddObservationPayload = {
        targetId: formData.targetId,
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseFloat(formData.radius),
        elevation: parseFloat(formData.elevation),
        baseRevisionId: parseInt(formData.baseRevisionId)
      };
      dispatch(addObservation(observationPayload));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-popout">
        <span className="close-button" onClick={onClose}>
          <Icon icon="cross" intent="primary" size={IconSize.LARGE} />
        </span>
        <h2 className="modal-title">Add Observation</h2>
        <div className="form-container">
          <form className="modal-form" onSubmit={handleSubmit}>
            {[
              { name: 'targetId', type: 'text', placeholder: 'Enter Target ID', readOnly: true },
              { name: 'name', type: 'text', placeholder: 'Enter Target Name', readOnly: true }, 
              { name: 'latitude', type: 'number', placeholder: 'Enter Latitude' },
              { name: 'longitude', type: 'number', placeholder: 'Enter Longitude' },
              { name: 'radius', type: 'number', placeholder: 'Enter Radius' },
              { name: 'elevation', type: 'number', placeholder: 'Enter Elevation' }
            ].map(input => (
              <div key={input.name} className="form-group">
                <label htmlFor={input.name}>{input.name}</label>
                <input
                  type={input.type}
                  id={input.name}
                  name={input.name}
                  value={formData[input.name] || ''}
                  placeholder={input.placeholder}
                  onChange={handleInputChange}
                  required
                  readOnly={input.readOnly || false}
                  className={errors[input.name] ? 'input-error' : ''}
                />
                {errors[input.name] && <span className="error-text">This field is required or invalid</span>}
              </div>
            ))}
            <div className="form-group">
              <label htmlFor="observationTimestamp">observationTimestamp</label>
              <input
                type="text"
                id="observationTimestamp"
                name="observationTimestamp"
                value={formData.observationTimestamp || ''}
                placeholder="Enter Observation Timestamp"
                onChange={handleInputChange}
                required
                className={errors['observationTimestamp'] ? 'input-error' : ''}
              />
              {errors['observationTimestamp'] && <span className="error-text">This field is required</span>}
            </div>
            <button type="submit" className="submit-button">Submit</button>
          </form>
          <div className="response-panel">
            {addObservationError && <div className="error-message">{addObservationError}</div>}
            {addObservationResponse && (
              <div className="response-message">
                <pre>{JSON.stringify(addObservationResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddObservation;