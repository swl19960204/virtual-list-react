import React, { createRef } from 'react';
import Virtual from './virtual-core';
import { Item, Slot } from './VirtualListItem';
export const EVENT_TYPE = { ITEM: 'item_resize', SLOT: 'slot_resize', };
const SLOT_TYPE = {
    HEADER: 'thead', // string value also use for aria role attribute  
    FOOTER: 'tfoot',
};
export class VirtualScrollList extends React.Component {
    static defaultProps = {
        keeps: 30,
        estimateSize: 50,
        direction: 'vertical',
        start: 0,
        offset: 0,
        pageMode: false,
        dataSources: [],
        rootTag: 'div',
        wrapTag: 'div',
        itemTag: 'div',
        topThreshold: 0,
        bottomThreshold: 0,
        footerTag: 'div',
        headerTag: 'div',
    };
    constructor(props) {
        super(props);
        this.state = { range: null, };
        this.root = createRef(null);
        this.shepherd = createRef(null);
    }
    componentWillMount() {
        this.isHorizontal = this.props.direction === 'horizontal';
        this.directionKey = this.isHorizontal ? 'scrollLeft' : 'scrollTop';
        this.installVirtual();
    }
    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.dataSources.length !== this.props.dataSources.length) {
            // 使用最新的数据，getUniqueIdFromDataSources中使用this.props获取不到最新的值     
            this.virtual.updateParam('uniqueIds', this.getUniqueIdFromDataSources(nextProps.dataSources));
            this.virtual.handleDataSourcesChange();
        }
        if (nextProps.keeps !== this.props.keeps) {
            this.virtual.updateParam('keeps', nextProps.keeps);
            this.virtual.handleSlotSizeChange();
        }
    }
    componentDidMount() {
        if (this.props.start) {
            this.scrollToIndex(this.props.start);
        } else if (this.props.offset) {
            this.scrollToOffset(this.props.offset);
        }
        // in page mode we bind scroll event to document  
        if (this.props.pageMode) {
            this.updatePageModeFront();
            document.addEventListener('scroll', this.onScroll, { passive: false, });
        }
    }
    componentWillUnmount() {
        this.virtual.destroy();
        if (this.props.pageMode) {
            document.removeEventListener('scroll', this.onScroll);
        }
    }
    installVirtual = () => {
        this.virtual = new Virtual({
            slotHeaderSize: 0, slotFooterSize: 0, keeps: this.props.keeps, estimateSize: this.props.estimateSize,
            buffer: Math.round(this.props.keeps / 3),
            // recommend for a third of keeps    
            uniqueIds: this.getUniqueIdFromDataSources(),
        }, this.onRangeChanged);
        // sync initial range   
        this.setState({ range: this.virtual.getRange(), });
    };
    // event called when each item mounted or size changed  
    onItemResized = (id, size) => {
        this.virtual.saveSize(id, size);
        typeof this.props.resized === 'function' && this.props.resized(id, size);
    };
    onSlotResized = (type, size, hasInit) => {
        if (type === SLOT_TYPE.HEADER) {
            this.virtual.updateParam('slotHeaderSize', size);
        } else if (type === SLOT_TYPE.FOOTER) {
            this.virtual.updateParam('slotFooterSize', size);
        }
        // if (hasInit) {  
        this.virtual.handleSlotSizeChange();
        // }
    };
    scrollToIndex = index => {
        if (index >= this.props.dataSources.length - 1) {
            this.scrollToBottom();
        } else {
            const offset = this.virtual.getOffset(index); this.scrollToOffset(offset);
        }
    };
    scrollToOffset = offset => {
        if (this.props.pageMode) {
            document.body[this.directionKey] = offset; document.documentElement[this.directionKey] = offset;
        } else {
            if (this.root.current) { this.root.current[this.directionKey] = offset; }
        }
    };
    scrollToBottom = () => {
        if (this.shepherd.current) {
            const offset = this.shepherd.current[this.isHorizontal ? 'offsetLeft' : 'offsetTop'];
            this.scrollToOffset(offset);
            setTimeout(() => {
                if (this.getOffset() + this.getClientSize() + 1 < this.getScrollSize()) { this.scrollToBottom(); }
            }, 3);
        }
    };
    updatePageModeFront = () => {
        const { current } = this.root;
        if (current) {
            const rect = current.getBoundingClientRect();
            const { defaultView } = current.ownerDocument;
            const offsetFront = this.isHorizontal ? rect.left + defaultView.pageXOffset : rect.top + defaultView.pageYOffset; this.virtual.updateParam('slotHeaderSize', offsetFront);
        }
    };
    onRangeChanged = range => {
        this.setState({ range, });
    };
    getUniqueIdFromDataSources = nextDataSources => {
        const { dataKey, dataSources } = this.props;
        const realDataSources = nextDataSources || dataSources;
        return realDataSources.map(dataSource => typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey]);
    };
    getOffset = () => {
        if (this.props.pageMode) {
            return document.documentElement[this.directionKey] || document.body[this.directionKey];
        }
        else { const { current } = this.root; return current ? Math.ceil(current[this.directionKey]) : 0; }
    };
    // return client viewport size  
    getClientSize = () => {
        const key = this.isHorizontal ? 'clientWidth' : 'clientHeight';
        if (this.props.pageMode) {
            return document.documentElement[key] || document.body[key];
        } else {
            const { current } = this.root;
            return current ? Math.ceil(current[key]) : 0;
        }
    };
    // return all scroll size 
    getScrollSize = () => {
        const key = this.isHorizontal ? 'scrollWidth' : 'scrollHeight';
        if (this.props.pageMode) {
            return document.documentElement[key] || document.body[key];
        } else { const { current } = this.root; return current ? Math.ceil(current[key]) : 0; }
    };
    // get item size by id  
    getSize = id => {
        return this.virtual.sizes.get(id);
    };
    // get the total number of stored (rendered) items 
    getSizes = () => { return this.virtual.sizes.size; };
    onScroll = evt => {
        const offset = this.getOffset();
        const clientSize = this.getClientSize();
        const scrollSize = this.getScrollSize();
        // iOS scroll-spring-back behavior will make direction mistake  
        if (offset < 0 || offset + clientSize > scrollSize + 1 || !scrollSize) { return; }
        this.virtual.handleScroll(offset);
        this.emitEvent(offset, clientSize, scrollSize, evt);
    };
    emitEvent = (offset, clientSize, scrollSize, evt) => {
        if (typeof this.props.scroll === 'function')
            this.props.scroll(evt, this.virtual.getRange());
        if (this.virtual.isFront() && !!this.props.dataSources.length && offset - this.props.topThreshold <= 0) {
            if (typeof this.props.totop === 'function') this.props.totop();
        } else if (this.virtual.isBehind() && offset + clientSize + this.props.bottomThreshold >= scrollSize) {
            if (typeof this.props.tobottom === 'function') this.props.tobottom();
        }
    };
    reset = () => {
        this.virtual.destroy();
        this.scrollToOffset(0);
        this.installVirtual();
    };
    getRenderSlots = () => {
        const slots = [];
        const { start, end } = this.state.range;
        const { dataSources, dataKey, itemClass, itemTag, itemStyle, extraProps, children } = this.props;
        for (let index = start; index <= end; index++) {
            const dataSource = dataSources[index];
            if (dataSource) {
                const uniqueKey = typeof dataKey === 'function' ? dataKey(dataSource) : dataSource[dataKey];
                if (typeof uniqueKey === 'string' || typeof uniqueKey === 'number') {
                    slots.push(React.createElement(Item,
                        {
                            ...{
                                index,
                                tag: itemTag,
                                [EVENT_TYPE.ITEM]: this.onItemResized,
                                horizontal: this.isHorizontal,
                                uniqueKey: uniqueKey,
                                source: dataSource,
                                extraProps: extraProps,
                                renderComponent: children,
                            }, style: itemStyle, className: itemClass,
                        }));
                } else {
                    console.warn(`Cannot get the data-key '${dataKey}' from data-sources.`);
                }
            } else {
                console.warn(`Cannot get the index '${index}' from data-sources.`);
            }
        }
        // React.Children.toArray   
        return slots;
    };
    handleActivated = offset => {
        // set back offset when awake from keep-alive 
        this.scrollToOffset(offset);
    };
    getVirtualOffset = () => {
        return this.getOffset();
    };
    render() {
        const { padFront, padBehind } = this.state.range;
        const { pageMode, rootTag, wrapTag, wrapClass, wrapStyle, headerTag,
             headerClass, headerStyle, footerTag, footerClass, footerStyle, 
             rootClass, rootStyle, header, footer } = this.props;
        const paddingStyle = { padding: this.isHorizontal ? `0px ${padBehind}px 0px ${padFront}px` : `${padFront}px 0px ${padBehind}px`, };
        const wrapperStyle = wrapStyle ? Object.assign({}, wrapStyle, paddingStyle) : paddingStyle;
        return React.createElement(rootTag,
            {
                ref: this.root,
                onScroll: !pageMode && this.onScroll,
                className: rootClass,
                style: rootStyle,
            },
            header && React.isValidElement(header)
                ? React.createElement(Slot, {
                    className: headerClass,
                    style: headerStyle,
                    childrenComp: header,
                    ...{ tag: headerTag, [EVENT_TYPE.SLOT]: this.onSlotResized, uniqueKey: SLOT_TYPE.HEADER, },
                }) : null,
            React.createElement(wrapTag,
                {
                    className: wrapClass,
                    ...{ role: 'group', },
                    style: wrapperStyle,
                }, ...this.getRenderSlots()),
            footer && React.isValidElement(footer)
                ? React.createElement(Slot,
                    {
                        className:
                            footerClass,
                        style: footerStyle,
                        childrenComp: footer,
                        ...{ tag: footerTag, [EVENT_TYPE.SLOT]: this.onSlotResized, uniqueKey: SLOT_TYPE.FOOTER, },
                    }) : null,
            React.createElement('div', {
                ref: this.shepherd,
                style: {
                    width:
                        this.isHorizontal ? '0px' : '100%',
                    height: this.isHorizontal ? '100%' : '0px',
                },
            }));
    }
}