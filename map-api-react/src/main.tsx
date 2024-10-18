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
import { Spinner, SpinnerSize } from '@blueprintjs/core';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, useSelector } from 'react-redux';
import store from './app/store';
import LayerMap from './components/LayerMap';
import LayerView from './components/LayerView';
import { selectLoading } from './features/mapApiGateway/mapApiGateway.selectors';
import './index.scss';

const App: React.FC = () => {
  const loading = useSelector(selectLoading);

  return (
    <div className="main-container">
      {loading && (
        <div className="spinner-overlay">
          <Spinner intent="primary" size={SpinnerSize.LARGE} />
        </div>
      )}
      <h1>Palantir Gaia Map API Gateway [React Demo]</h1>
      <div className="content-container">
        <div className="left-container">
          <LayerMap />
        </div>
        <div className="right-container">
          <LayerView />
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  container
);