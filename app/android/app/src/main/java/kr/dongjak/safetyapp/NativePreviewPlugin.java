package kr.dongjak.safetyapp;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
@CapacitorPlugin(name="NativeIntegratedPreview")
public final class NativePreviewPlugin extends Plugin {
 @PluginMethod public void show(PluginCall call){((MainActivity)getActivity()).showSnapshot(call);}
 @PluginMethod public void camera(PluginCall call){((MainActivity)getActivity()).syncCamera(call);}
 @PluginMethod public void hide(PluginCall call){getActivity().runOnUiThread(()->{((MainActivity)getActivity()).hideNative();call.resolve();});}
}
