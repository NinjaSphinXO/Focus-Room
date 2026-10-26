import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface RoomState {
    onlineUserIds: string[];
    channelStatus: string;
}

const initialState: RoomState = {
    onlineUserIds: [],
    channelStatus: "CLOSED",
};

const roomSlice = createSlice({
    name: "room",
    initialState,
    reducers: {
        setOnline: (state, action: PayloadAction<string[]>) => {
            state.onlineUserIds = action.payload;
        },
        setChannelStatus: (state, action: PayloadAction<string>) => {
            state.channelStatus = action.payload;
        },
        resetRoom: () => initialState,
    },
});

export const { setOnline, setChannelStatus, resetRoom } = roomSlice.actions;
export default roomSlice.reducer;