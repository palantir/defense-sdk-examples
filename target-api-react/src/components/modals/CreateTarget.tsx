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
import { selectCreateTargetError, selectCreateTargetResponse } from '../../features/targetApiGateway/targetApiGateway.selectors';
import { clearCreateTargetResponse, createTarget, CreateTargetPayload, loadTargetsWithoutLoading } from '../../features/targetApiGateway/targetApiGateway.slice';

interface CreateTargetProps {
  selectedBoard: string | null;
  onClose: () => void;
  initialLat: number;
  initialLon: number;
}

const CreateTarget: React.FC<CreateTargetProps> = ({ selectedBoard, onClose, initialLat, initialLon }) => {
  const dispatch = useDispatch();
  const createTargetResponse = useSelector(selectCreateTargetResponse);
  const createTargetError = useSelector(selectCreateTargetError);

  const getCurrentUTCTimestamp = (): string => {
    return Date.now().toLocaleString();
  };

  const [formData, setFormData] = useState({
    latitude: initialLat.toString(),
    longitude: initialLon.toString(),
    classificationMarkings: 'MU',
    observationTimestamp: getCurrentUTCTimestamp(),
    targetBoardId: selectedBoard || '',
    name: '',
    targetType: '',
    description: '',
    radius: "1.0",
    column: 'DRAFT',
  });
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});
  const [hasDispatchedLoadTargets, setHasDispatchedLoadTargets] = useState(false);

  useEffect(() => {
    if (selectedBoard) {
      setFormData(prevState => ({ ...prevState, targetBoardId: selectedBoard }));
    }
  }, [selectedBoard]);

  useEffect(() => {
    return () => {
      dispatch(clearCreateTargetResponse());
    };
  }, [dispatch]);

  useEffect(() => {
    if (createTargetResponse && !hasDispatchedLoadTargets) {
      dispatch(loadTargetsWithoutLoading());
      setHasDispatchedLoadTargets(true);
    }
  }, [createTargetResponse, dispatch, hasDispatchedLoadTargets]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: name === 'classificationMarkings' ? value.split(',').map(item => item.trim()).join(',') : value
    }));
    if (errors[name]) {
      setErrors(prevState => ({
        ...prevState,
        [name]: false
      }));
    }
    dispatch(clearCreateTargetResponse());
    setHasDispatchedLoadTargets(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const requiredFields: (keyof typeof formData)[] = ['targetBoardId', 'classificationMarkings', 'name', 'description', 'targetType', 'observationTimestamp', 'latitude', 'longitude'];
    const newErrors: { [key: string]: boolean } = {};
    let hasErrors = false;

    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = true;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
    } else {
      const payload: CreateTargetPayload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseFloat(formData.radius),
        classificationMarkings: formData.classificationMarkings.split(',').map(item => item.trim()),
        observationTimestamp: formData.observationTimestamp
      };

      dispatch(createTarget(payload));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-popout">
        <span className="close-button" onClick={onClose}>
          <Icon icon="cross" intent="primary" size={IconSize.LARGE} />
        </span>
        <h2 className="modal-title">Create Target</h2>
        <div className="form-container">
          <form className="modal-form" onSubmit={handleSubmit}>
            {[
              { name: 'targetBoardId', type: 'text', placeholder: 'Enter Target Board ID' },
              { name: 'column', type: 'text', placeholder: 'Enter Target Board Column' },
              { name: 'classificationMarkings', type: 'text', placeholder: 'Enter Classification Markings (comma-separated)' },
              { name: 'name', type: 'text', placeholder: 'Enter Name' },
              { name: 'description', type: 'text', placeholder: 'Enter Description' },
              { name: 'targetType', type: 'text', placeholder: 'Enter Target Type' },
              { name: 'observationTimestamp', type: 'text', placeholder: 'Enter Observation Timestamp' },
              { name: 'latitude', type: 'number', placeholder: 'Enter Latitude' },
              { name: 'longitude', type: 'number', placeholder: 'Enter Longitude' },
              { name: 'radius', type: 'number', placeholder: 'Enter Radius' }
            ].map(input => (
              <div key={input.name} className="form-group">
                <label htmlFor={input.name}>{input.name}</label>
                <input
                  type={input.type}
                  id={input.name}
                  name={input.name}
                  value={formData[input.name as keyof typeof formData] || ''}
                  placeholder={input.placeholder}
                  onChange={handleInputChange}
                  required
                  className={errors[input.name] ? 'input-error' : ''}
                />
                {errors[input.name] && <span className="error-text">This field is required</span>}
              </div>
            ))}
            <button type="submit" className="submit-button">Submit</button>
          </form>
          <div className="response-panel">
            {createTargetError && <div className="error-message">{createTargetError}</div>}
            {createTargetResponse && (
              <div className="response-message">
                <pre>{JSON.stringify(createTargetResponse, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTarget;