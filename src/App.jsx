import React, { useState } from 'react'
import { VirtualScrollList } from './components/VirtualList'
const getPageData = (count, currentLength) => {
  const DataItems = []
  for (let i = 0; i < count; i++) {
    const index = currentLength + i
    DataItems.push({
      index,
      text: 'Item ' + i,
      lineHeight: 20 + (i % 20) + 'px',
      id: Math.random() * (index + 1),
    })
  }
  return DataItems
}
const pageSize = 20;
function App() {
  const [items, setItems] = useState(getPageData(pageSize, 0))
  function onScrollToBottom() {
    console.log('to bottom')
    setTimeout(() => {
      setItems((items) => {
        const mergeItems = items.concat(getPageData(pageSize, items.length));
        return mergeItems
      })
    }, 500);
  }
  return (
    <div>
      <VirtualScrollList
        dataSources={items}
        estimateSize={80}
        dataKey={'id'}
        tobottom={onScrollToBottom}
        rootClass={"list-infinite"}
        itemClass={"list-item-infinite"}
        footer={
          <div className="footer">
            <div className="spinner"></div>
            {/* <div className="finished">No more data</div> */}
          </div>
        }
      >
        {
          (item, _) => {
            return <div className="item-inner">
              <div className="head">
                <span className="index"># {item.text}</span>
                <span className="name">{item.lineHeight}</span>
              </div>
              <div className="desc">{item.index}</div>
            </div>
          }
        }
      </VirtualScrollList>
    </div>
  )
}

export default App
