export type JSONValue = JSONArray | JSONObject | boolean | number | string | null;

export type JSONObject = {
  [key: string]: JSONValue;
};

export type JSONArray = JSONValue[];
