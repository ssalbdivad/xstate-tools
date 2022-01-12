import { assign } from "xstate";
import { MachineConfig } from "xstate";
import { interpret } from "xstate";
import { createMachine } from "xstate";
import { compressToEncodedURIComponent } from "lz-string";

declare global {
  function acquireVsCodeApi(): {
    postMessage: (event: EditorWebviewScriptEvent) => void;
  };
}

export interface WebViewMachineContext {
  config: MachineConfig<any, any, any>;
  uri: string;
  index: number;
  layoutString: string | undefined;
}

export type EditorWebviewScriptEvent =
  | {
      type: "RECEIVE_SERVICE";
      config: MachineConfig<any, any, any>;
      layoutString: string | undefined;
      uri: string;
      index: number;
    }
  | {
      type: "DEFINITION_UPDATED";
      layoutString: string;
      config: MachineConfig<any, any, any>;
    }
  | UpdateDefinitionEvent;

export type UpdateDefinitionEvent = {
  type: "UPDATE_DEFINITION";
  config: MachineConfig<any, any, any>;
  layoutString: string;
  uri: string;
  index: number;
};

let vscodeApi: ReturnType<typeof acquireVsCodeApi>;

const getVsCodeApi = () => {
  if (!vscodeApi) {
    vscodeApi = acquireVsCodeApi();
  }

  return vscodeApi;
};

const machine = createMachine<WebViewMachineContext, EditorWebviewScriptEvent>({
  initial: "waitingForFirstContact",
  context: {
    config: {},
    uri: "",
    index: 0,
    layoutString: undefined,
  },
  invoke: {
    src: () => (send) => {
      const listener = (event) => {
        try {
          send(JSON.parse(event.data));
        } catch (e) {
          console.warn(e);
        }
      };
      window.addEventListener("message", listener);

      return () => window.removeEventListener("message", listener);
    },
  },
  on: {
    DEFINITION_UPDATED: {
      actions: (ctx, event) => {
        getVsCodeApi().postMessage({
          type: "UPDATE_DEFINITION",
          config: event.config,
          index: ctx.index,
          uri: ctx.uri,
          layoutString: event.layoutString,
        });
      },
    },
    RECEIVE_SERVICE: {
      target: ".hasService",
      actions: assign((context, event) => {
        return {
          config: event.config,
          index: event.index,
          uri: event.uri,
          layoutString: event.layoutString,
        };
      }),
      internal: false,
    },
  },

  states: {
    waitingForFirstContact: {},
    hasService: {
      invoke: {
        src: (context) => () => {
          const iframe = document.getElementById("iframe") as HTMLIFrameElement;

          if (!iframe) return;

          iframe.src = `http://localhost:3000/registry/editor/from-url?config=${compressToEncodedURIComponent(
            JSON.stringify(context.config),
          )}${context.layoutString ? `&layout=${context.layoutString}` : ""}`;
        },
      },
      states: {},
    },
  },
});

interpret(machine).start();
