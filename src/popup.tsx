import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import "@radix-ui/themes/styles.css";
import { CheckCircledIcon, GearIcon } from "@radix-ui/react-icons";
import "./popup.css";
import { IconContext } from "react-icons";
import { GoCheckCircleFill } from "react-icons/go";

import { useDebounce } from "usehooks-ts";

import Fuse from 'fuse.js';
import { Item } from './fuse'

import {
  ItemTypes,
  ItemType2TextMap,
  DefaultResultsMaxNum,
  log,
} from "./common";

const Popup = () => {
  const [focus, setFocus] = useState(true);

  useEffect(() => {
    // chrome.storage.sync.get(['limit', 'search_mode']).then((result) => {
    //   log('storage.sync.get:', result)
    //   setLimit(result.limit)
    // })
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce<string>(searchTerm, 100);
  const [results, setResults] = useState([]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(event.target.value);
  }

  useEffect(() => {
    if (!searchTerm) return;
    chrome.runtime.sendMessage(
      { type: "SEARCH", data: { query: searchTerm } },
      (resp) => {
        console.log("resp:", resp);
        if (!resp) return;
        setResults(resp.data.results);
      }
    );
  }, [debouncedSearchTerm]);


  const resultsList = results.map((val: Fuse.FuseResult<Item>) => (
    <div style={{overflow: 'hidden'}}>
      <span>{val.item.title}</span>
      {'    '}
      <span>{val.item.url}</span>
    </div>
  ))


  const SearchRangesBoxes = ItemTypes.map((val, i) => (
    <div
      className="search-range-box"
      tabIndex={i + 1}
      key={val}
      style={{
        padding: "8px",
        // width: '85px',
        minWidth: "60px",
        display: "flex",
        flexDirection: "row",
        alignContent: "center",
        justifyContent: "center",
        justifyItems: "center",
        alignItems: "center",
        gap: "3px",
      }}
    >
      <IconContext.Provider value={{ color: "var(--theme-color)" }}>
        <div style={{ height: "16px" }}>
          <GoCheckCircleFill size={16} />
        </div>
      </IconContext.Provider>
      {/* <CheckCircledIcon width="16px" height="16px" color="green" style={{alignSelf: 'start'}} /> */}
      <span style={{ fontSize: "14px" }}>{ItemType2TextMap.get(val)}</span>
    </div>
  ));

  return (
    <div
      style={{
        height: "500px",
        width: "800px",
        background: "var(--gray-1)",
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "20px",
          alignItems: "center",
        }}
      >
        <input
          className={"search-input " + (focus ? "input-box-shadow" : "")}
          placeholder="type to search..."
          autoFocus
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={handleChange}
        />

        <div
          className="search-range"
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
          }}
        >
          {SearchRangesBoxes}
        </div>

        <div>
          <GearIcon width="20px" height="20px" />
        </div>
      </div>

      {resultsList}
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(<Popup />);
