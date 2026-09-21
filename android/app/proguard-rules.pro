# Mantém classes do Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# Mantém classe do seu plugin
-keep class com.meuiptv.plugin.** { *; }

# Ofusca tudo o mais
-repackageclasses 'obf'
-allowaccessmodification
-optimizationpasses 5

# Remove logs e asserts
-assumenosideeffects class android.util.Log {
  public static *** d(...);
  public static *** v(...);
  public static *** i(...);
}

# Mantém enums e anotações
-keepclasseswithmembernames class * {
    native <methods>;
}
-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}
