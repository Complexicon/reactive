import React from 'react';
import ReactDOM from 'react-dom';

import './demo.css'

function App() {
	return (
		<div>
			<h1 style={{ backgroundColor: 'blue' }}>Hello World!</h1>
		</div>
	);
}

ReactDOM.render(<App />, document.getElementById('app'));