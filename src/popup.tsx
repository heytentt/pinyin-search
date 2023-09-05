import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DefaultResultsMaxNum, log } from "./common";

const Popup = () => {
  const [limit, setLimit] = useState(DefaultResultsMaxNum);

  useEffect(() => {
    chrome.storage.sync.get(['limit', 'search_mode']).then((result) => {
      log('storage.sync.get:', result)
      setLimit(result.limit)
    })
  }, []);

  const changeBackground = () => {

  };

  return (
    <>
      <ul style={{ width: "300px" }}>
        {/* <li>Current URL: {currentURL}</li> */}
        <li>Current Time: {new Date().toLocaleTimeString()}</li>
      </ul>
      <button
        // onClick={() => setCount(count + 1)}
        style={{ marginRight: "5px" }}
      >
        count up
      </button>
      <button onClick={changeBackground}>change background</button>
    </>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>
);
