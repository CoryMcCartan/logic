"use strict";

let Stack = function(size = 32) {
    const INCREMENT = 32;
    let stack_buf = new ArrayBuffer(size);
    let stack = new Int8Array(stack_buf);

    let pointer = 0;
    
    this.push = function(value) {
        stack[pointer] = value;
        checkAndExpand();
        return pointer++;
    };
    this.pop = function() {
        if (pointer > 0) 
            return stack[--pointer]; // no need to delete old value
        else
            return 0;
    };
    this.empty = function() {
        return (pointer === 0);
    };

    window._s = stack; // TODO remove

    let checkAndExpand = function() {
        if (size - pointer <= 1) {
            size += INCREMENT;
            stack_buf = ArrayBuffer.transfer(stack_buf, size);
        }
    };
};

let WAM = (function() {
    let self = {};

    //  enums
    const REF_TYPE = -1;
    const STR_TYPE = -2;
    const READ_MODE = 0;
    const WRITE_MODE = 1;

    let INCREMENT = 1024;
    let heap_size = 512;
    let code_size = 256;
    let CELL_SIZE = 3;

    let heap_buf = new ArrayBuffer(heap_size);
    let heap = new Int8Array(heap_buf);
    let pointer = 0; // points to next available free memory

    let code_buf = new ArrayBuffer(code_size)
    let code = new Int8Array(code_buf);
    let instruction = 0; // points to next instruction to execute

    let mode; // READ_MODE or WRITE_MODE
    let subterm; // pointer to where in the heap the next subterm is
    let PDL = new Stack();

    let registers = [];

    self.call = function(addr) {
        instruction = addr;
    };

    self.putStructure = function(id, arity, reg = 0) {
        let ptr = pointer;
        // store cell with (STR, pointer to next cell)
        heap[pointer] = STR_TYPE;
        heap[pointer + 1] = (pointer + CELL_SIZE) >> 8;
        heap[pointer + 2] = (pointer + CELL_SIZE) & 0xff;
        // put same cell in register
        registers[reg] = [STR_TYPE, pointer]; // + CELL_SIZE
        // store cell with (ID, arity)
        heap[pointer + 3] = id >> 8;
        heap[pointer + 4] = id & 0xff;
        heap[pointer + 5] = arity;

        pointer += 2 * CELL_SIZE;
        checkAndExpandHeap();

        return ptr;
    };

    self.getStructure = function(id, arity, reg) {
        let addr = dereference(registers[reg][1]); 
        let tag = heap[addr];

        subterm = CELL_SIZE;

        switch (tag) {
            case REF_TYPE:
                let ptr = self.putStructure(id, arity);
                bind(addr, ptr);
                mode = WRITE_MODE;
                break;
            case STR_TYPE:
                let value = (heap[addr + 1] << 8) | heap[addr + 2];
                let test_id = (heap[value] << 8) | heap[value + 1];
                let test_arity = heap[value + 2];
                if (test_id === id && test_arity === arity) {
                    subterm = value + CELL_SIZE;
                    mode = READ_MODE;
                } else {
                    return fail();
                }
                break;
            default:
                return fail();
                break;
        }
    };


    self.putVariable = function(reg_x, reg_a) {
        let ptr = pointer;
        // add to heap
        heap[pointer] = REF_TYPE;
        heap[pointer + 1] = pointer >> 8;
        heap[pointer + 2] = pointer & 0xff;
        // save to registers
        registers[reg_x] = [REF_TYPE, pointer];
        registers[reg_a] = [REF_TYPE, pointer];

        pointer += CELL_SIZE;
        checkAndExpandHeap();

        return ptr;
    };
    self.getVariable = function(reg_x, reg_a) {
        registers[reg_x][0] = registers[reg_a][0];    
        registers[reg_x][1] = registers[reg_a][1];    
    };

    self.setVariable = function(reg) {
        let ptr = pointer;
        // store cell with (REF, pointer)
        heap[pointer] = REF_TYPE;
        heap[pointer + 1] = pointer >> 8; // upper half of int
        heap[pointer + 2] = pointer & 0xff; // lower half of int
        // put same cell in register
        registers[reg] = [REF_TYPE, pointer];

        pointer += CELL_SIZE;
        checkAndExpandHeap();

        return ptr;
    };

    self.unifyVariable = function(reg) {
        let ptr;

        switch (mode) {
            case READ_MODE:
                ptr = subterm;
                break;
            case WRITE_MODE:
                ptr = self.setVariable();
                break;
        } 

        subterm += CELL_SIZE;

        let tag = heap[ptr];
        let addr = (heap[ptr + 1] << 8) | heap[ptr + 2];
        registers[reg] = [tag, addr];
    };


    self.getValue = function(reg_x, reg_a) {
        let addr1 = registers[reg_x][1]; 
        let addr2 = registers[reg_a][1]; 

        return unify(addr1, addr2);
    };

    self.putValue = function(reg_x, reg_a) {
        registers[reg_a][0] = registers[reg_x][0];    
        registers[reg_a][1] = registers[reg_x][1];    
    };

    self.setValue = function(reg) { // addr is pointer to original reference
        let tag = registers[reg][0];
        let addr = registers[reg][1];
        // store cell with (REF, r)
        heap[pointer] = tag;
        heap[pointer + 1] = addr >> 8;
        heap[pointer + 2] = addr & 0xff;

        pointer += CELL_SIZE;
        checkAndExpandHeap();
    };

    self.unifyValue = function(reg) {
        let addr = registers[reg][1];

        switch (mode) {
            case READ_MODE:
                unify(addr, subterm);
                break;
            case WRITE_MODE:
                self.setValue(reg);
                break;
        } 

        subterm += CELL_SIZE;
    };


    let dereference = function(addr) {
        // extract tag and value from addr
        let tag = heap[addr];
        let value = (heap[addr + 1] << 8) | heap[addr + 2];
        // check if addr references another reference
        if (tag === REF_TYPE && value !== addr) {
            return dereference(value);
        } else { // or if references itself
            return addr;
        }
    };

    // bind unbound REF to bound
    let bind = function(addr1, addr2) {
        let v1 = (heap[addr1 + 1] << 8) | heap[addr1 + 2];
        let v2 = (heap[addr2 + 1] << 8) | heap[addr2 + 2];

        if (v1 === addr1) { // first address is unbound
            // bind first address to second 
            heap[addr1 + 1] = addr2 >> 8;
            heap[addr1 + 2] = addr2 & 0xff;
        } else if (v2 === addr2) { // second address is unbound
            // bind second address to first
            heap[addr2 + 1] = addr1 >> 8;
            heap[addr2 + 2] = addr1 & 0xff;
        } else { // at least one needs to be unbound
            return fail();
        }
    };

    // unification algorithm based on UNION/FIND
    let unify = function(addr1, addr2) {
        PDL.push(addr1);
        PDL.push(addr2);

        let failed = false;
        while(!(PDL.empty() || failed)) {
            let d1 = dereference(PDL.pop());
            let d2 = dereference(PDL.pop());
            if (d1 !== d2) {
                let tag1 = heap[d1];
                let v1 = (heap[d1 + 1] << 8) | heap[d1 + 2];
                let tag2 = heap[d2];
                let v2 = (heap[d2 + 1] << 8) | heap[d2 + 2];

                if (tag1 === REF_TYPE || tag2 === REF_TYPE) {
                    bind(d1, d2);
                } else { // both are structures
                    // get IDs and aritys of each
                    let id1 = (heap[v1] << 8) | heap[v1 + 1];
                    let arity1 = heap[v1 + 2];
                    let id2 = (heap[v2] << 8) | heap[v2 + 1];
                    let arity2 = heap[v2 + 2];

                    // unify their terms
                    if (id1 === id2 && arity1 === arity2) {
                        for (let i = 1; i <= arity1; i++) {
                            PDL.push(v1 + i * CELL_SIZE);
                            PDL.push(v2 + i * CELL_SIZE);
                        }
                    } else {
                        failed = true;
                    }
                }
            }
        }

        if (failed) return fail();
    };

    let fail = function() {
        console.log("FAILURE.");
        return false;
    };

    let checkAndExpandHeap = function() {
        // TODO potentially separate check and expansion for performance reasons
        if (heap_size - pointer <= CELL_SIZE) {
            heap_size += INCREMENT;
            heap_buf = ArrayBuffer.transfer(heap_buf, heap_size);
        }
    };

    self.cellToString = function(idx) {
        let i = idx * CELL_SIZE; // turn index into pointer
        let tag = heap[i];
        let value = ((heap[i + 1] << 8) | heap[i + 2]) / CELL_SIZE;
        let id_str = ("000" + idx).slice(-3);

        if (tag === REF_TYPE) {
            return `${id_str}: (REF, ${value})`;
        } else if (tag === STR_TYPE) {
            return `${id_str}: (STR, ${value})`;
        } else { // neither
           let id = (heap[i] << 8) | heap[i + 1]; 
           let arity = heap[i + 2];
           return `${id_str}:  ${String.fromCharCode(id)} / ${arity}`;
        }
    };

    self.cellsToString = function(start, end) {
        let str = "\n";
        for (let i = start; i < end; i++) {
            str += self.cellToString(i) + "\n";
        }

        return str;
    };

    self.toString = function() {
        return self.cellsToString(0, ~~(SIZE / CELLS_SIZE));
    };

    // print bound value of term or variable stored at addr
    self.traceBinding = function(addr, str = "") {
        addr = dereference(addr);
        let tag = heap[addr];
        let value = (heap[addr + 1] << 8) | heap[addr + 2];

        if (tag === REF_TYPE) {
            return self.traceBinding(value);
        } else { // STR
            let id = (heap[value] << 8) | heap[value + 1];
            let arity = heap[value + 2];
            str += String.fromCharCode(id);
            if (arity > 0) {
                str += "("
                // trace binding on each argument
                for (let i = 1; i <= arity; i++) {
                    str += self.traceBinding(value + i * CELL_SIZE) + ", ";
                }
                str = str.slice(0, -2); // remove last comma
                str += ")";
            }
            return str;
        }
    };

    // TODO remove
    window._h = heap;
    window._r = registers;

    return self;
})();
